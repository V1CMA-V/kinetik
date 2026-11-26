import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export const householdKeys = {
  all: ['household'] as const,
};

export type HouseholdMember = {
  userId: string;
  name: string | null;
  role: 'owner' | 'member';
  isMe: boolean;
};

export type Household = {
  id: string;
  members: HouseholdMember[];
  /** Unused, unexpired invite code, if any. */
  invite: { code: string; expiresAt: string } | null;
};

/** Spanish messages for the errors raised by the household RPCs. */
const RPC_ERRORS: Record<string, string> = {
  invalid_code: 'Ese código no existe o ya se usó. Pide uno nuevo.',
  expired_code: 'Ese código ya venció. Pide a tu pareja que genere uno nuevo.',
  already_in_household: 'Ya estás en un hogar. Sal de él antes de unirte a otro.',
  household_full: 'Ese hogar ya tiene dos personas.',
  not_authenticated: 'Tu sesión expiró. Vuelve a iniciar sesión.',
};

function toHouseholdError(error: { message: string }, fallback: string) {
  return new Error(RPC_ERRORS[error.message] ?? fallback);
}

/** The current user's household (members and pending invite); `null` if they have none. */
export function useHousehold() {
  const myId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: householdKeys.all,
    enabled: !!myId,
    queryFn: async (): Promise<Household | null> => {
      // RLS only returns the rows of the user's own household.
      const members = await supabase
        .from('household_members')
        .select('household_id, user_id, role');
      if (members.error) throw members.error;
      if (!members.data.length) return null;

      const householdId = members.data[0].household_id;
      const userIds = members.data.map((m) => m.user_id);

      const [profiles, invites] = await Promise.all([
        supabase.from('profiles').select('id, display_name').in('id', userIds),
        supabase
          .from('household_invites')
          .select('code, expires_at')
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (profiles.error) throw profiles.error;
      if (invites.error) throw invites.error;

      const names = new Map(profiles.data.map((p) => [p.id, p.display_name]));
      const invite = invites.data[0];

      return {
        id: householdId,
        members: members.data.map((m) => ({
          userId: m.user_id,
          name: names.get(m.user_id) ?? null,
          role: m.role === 'owner' ? 'owner' : 'member',
          isMe: m.user_id === myId,
        })),
        invite: invite ? { code: invite.code, expiresAt: invite.expires_at } : null,
      };
    },
  });
}

/** The other member of the household, if they already joined. */
export function usePartner() {
  const household = useHousehold();
  const partner = household.data?.members.find((m) => !m.isMe) ?? null;
  return {
    householdId: household.data?.id ?? null,
    partner: partner ? { id: partner.userId, name: partner.name ?? 'Tu pareja' } : null,
  };
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_household_invite');
      if (error) throw toHouseholdError(error, 'No se pudo generar el código. Inténtalo de nuevo.');
      return data[0];
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdKeys.all }),
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.rpc('accept_household_invite', { p_code: code });
      if (error) throw toHouseholdError(error, 'No se pudo unir al hogar. Inténtalo de nuevo.');
    },
    // Shared accounts and their movements become visible.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useLeaveHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('leave_household');
      if (error) throw toHouseholdError(error, 'No se pudo salir del hogar. Inténtalo de nuevo.');
    },
    // Shared accounts stop being visible on both sides.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
