import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InputField from '../../components/InputField';

describe('InputField', () => {
  it('renders correctly with label', () => {
    const { getByText } = render(
      <InputField label="Test Label" onChangeText={() => {}} />
    );
    
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('handles text input correctly', () => {
    const onChangeTextMock = jest.fn();
    const { getByTestId } = render(
      <InputField 
        label="Test Label" 
        placeholder="Enter text"
        onChangeText={onChangeTextMock}
        testID="test-input"
      />
    );
    
    const input = getByTestId('test-input');
    fireEvent.changeText(input, 'test input');
    expect(onChangeTextMock).toHaveBeenCalledWith('test input');
  });

  it('renders with secure text entry', () => {
    const { getByTestId } = render(
      <InputField 
        label="Password" 
        placeholder="Enter password"
        secureTextEntry={true}
        onChangeText={() => {}}
        testID="test-input"
      />
    );
    
    const input = getByTestId('test-input');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('renders with custom styles', () => {
    const { getByTestId } = render(
      <InputField 
        label="Test Label"
        placeholder="Enter text"
        labelStyle="text-red-500"
        containerStyle="bg-blue-100"
        inputStyle="text-lg"
        onChangeText={() => {}}
        testID="test-input"
      />
    );
    
    const input = getByTestId('test-input');
    expect(input.props.style).toBeTruthy();
  });

  it('renders with icon', () => {
    const { getByTestId } = render(
      <InputField 
        label="Test Label"
        onChangeText={() => {}}
        testID="test-input"
      />
    );
    
    expect(getByTestId('test-input')).toBeTruthy();
  });
}); 