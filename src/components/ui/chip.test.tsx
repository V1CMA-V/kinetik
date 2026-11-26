import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from '@/components/ui/chip';

describe('Chip', () => {
  it('renders its label and exposes the selected state', async () => {
    await render(<Chip label="Comida" selected />);
    expect(screen.getByRole('radio', { name: 'Comida' })).toBeSelected();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Transporte" onPress={onPress} />);
    fireEvent.press(screen.getByText('Transporte'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
