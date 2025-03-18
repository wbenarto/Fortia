import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CustomButton from '../../components/CustomButton';

describe('CustomButton', () => {
  it('renders correctly with default props', () => {
    const { getByText } = render(
      <CustomButton title="Test Button" onPress={() => {}} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress handler when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <CustomButton title="Test Button" onPress={onPressMock} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(onPressMock).toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    const { rerender, getByTestId } = render(
      <CustomButton 
        title="Test Button" 
        onPress={() => {}} 
        bgVariant="secondary"
        testID="test-button"
      />
    );
    
    const secondaryButton = getByTestId('test-button');
    expect(secondaryButton.props.style).toBeTruthy();

    rerender(
      <CustomButton 
        title="Test Button" 
        onPress={() => {}} 
        bgVariant="danger"
        testID="test-button"
      />
    );
    const dangerButton = getByTestId('test-button');
    expect(dangerButton.props.style).toBeTruthy();
  });

  it('renders with left and right icons', () => {
    const IconMock = () => <></>;
    const { getByTestId } = render(
      <CustomButton 
        title="Test Button" 
        onPress={() => {}} 
        IconLeft={IconMock}
        IconRight={IconMock}
        testID="test-button"
      />
    );
    
    expect(getByTestId('test-button')).toBeTruthy();
  });
}); 