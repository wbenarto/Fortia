import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MacrosTracking from '../../components/MacrosTracking';

describe('MacrosTracking', () => {
  const mockProps = {
    dailyGoal: {
      protein: 150,
      carbs: 200,
      fats: 70,
    },
    currentIntake: {
      protein: 100,
      carbs: 150,
      fats: 50,
    },
    weeklyData: [
      { date: 'Mon', protein: 120, carbs: 180, fats: 60 },
      { date: 'Tue', protein: 130, carbs: 190, fats: 65 },
      { date: 'Wed', protein: 110, carbs: 170, fats: 55 },
      { date: 'Thu', protein: 140, carbs: 200, fats: 70 },
      { date: 'Fri', protein: 125, carbs: 185, fats: 62 },
      { date: 'Sat', protein: 135, carbs: 195, fats: 68 },
      { date: 'Sun', protein: 100, carbs: 150, fats: 50 },
    ],
    onAddMeal: jest.fn(),
  };

  it('renders correctly with all props', () => {
    const { getByText, getByTestId } = render(<MacrosTracking {...mockProps} />);
    
    // Check if main elements are rendered
    expect(getByText('Macros Tracking')).toBeTruthy();
    expect(getByText("Today's Progress")).toBeTruthy();
    expect(getByText('Weekly Overview')).toBeTruthy();
    expect(getByText('Add Meal')).toBeTruthy();
    
    // Check if macro progress bars are rendered with correct values
    expect(getByText('Protein')).toBeTruthy();
    expect(getByText('100g / 150g')).toBeTruthy();
    expect(getByText('Carbs')).toBeTruthy();
    expect(getByText('150g / 200g')).toBeTruthy();
    expect(getByText('Fats')).toBeTruthy();
    expect(getByText('50g / 70g')).toBeTruthy();
  });

  it('calls onAddMeal when Add Meal button is pressed', () => {
    const { getByText } = render(<MacrosTracking {...mockProps} />);
    
    const addMealButton = getByText('Add Meal');
    fireEvent.press(addMealButton);
    
    expect(mockProps.onAddMeal).toHaveBeenCalledTimes(1);
  });

  it('displays correct daily goal percentage', () => {
    const { getByText } = render(<MacrosTracking {...mockProps} />);
    
    // Calculate expected percentage: (100 + 150 + 50) / (150 + 200 + 70) * 100 ≈ 71%
    expect(getByText('71%')).toBeTruthy();
  });

  it('displays correct total intake', () => {
    const { getByText } = render(<MacrosTracking {...mockProps} />);
    
    // Calculate expected total: 100 + 150 + 50 = 300g
    expect(getByText('300g')).toBeTruthy();
  });
}); 