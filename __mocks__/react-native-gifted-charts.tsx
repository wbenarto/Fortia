import React from 'react';
import { View } from 'react-native';

export const LineChart: React.FC<any> = ({ data, height, width, ...props }) => {
  return (
    <View style={{ height, width }}>
      {/* Mock chart visualization */}
      <View style={{ 
        height: '100%', 
        width: '100%', 
        backgroundColor: '#494358',
        opacity: 0.2 
      }} />
    </View>
  );
}; 