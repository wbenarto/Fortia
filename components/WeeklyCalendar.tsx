import { View, Text } from 'react-native';

const WeeklyCalendar = () => {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const today = new Date();

	const dates = Array.from({ length: 7 }, (_, i) => {
		const date = new Date();
		date.setDate(date.getDate() - date.getDay() + i);
		return {
			date: date.getDate(),
			isToday: date.getDate() === today.getDate(),
		};
	});

	return (
		<View className="flex flex-row justify-between px-4 py-2">
			{days.map((day, index) => (
				<View key={index} className="items-center mx-3">
					<Text
						className={`text-[10px] mb-1 ${dates[index].isToday ? 'text-[#E3BBA1]' : 'text-gray-600'}`}
					>
						{day}
					</Text>
					<Text
						className={`text-[10px] font-JakartaSemibold ${dates[index].isToday ? 'text-[#E3BBA1] text-base' : 'text-gray-600'}`}
					>
						{dates[index].date}
					</Text>
					{dates[index].isToday ? (
						<View className="w-1 h-1 mt-2 bg-[#E3BBA1] rounded-full"></View>
					) : (
						''
					)}
				</View>
			))}
		</View>
	);
};

export default WeeklyCalendar;
