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
		<View className="flex flex-row justify-between px-6 items-center py-1">
			{days.map((day, index) => (
				<View
					key={index}
					className={`items-center border-solid ${dates[index].isToday ? 'border-[1px] border-[#E3BBA1] px-3 py-1 mx-0 rounded-md' : '   px-2'} `}
				>
					<Text className={`text-[10px] mb-1  text-gray-600 `}>{day}</Text>
					<Text
						className={`text-[10px] font-JakartaSemibold ${dates[index].isToday ? 'text-gray-600 text-base' : 'text-gray-600'}`}
					>
						{dates[index].date}
					</Text>
					{/* {dates[index].isToday ? (
						<View className="w-1 h-1 mt-2 bg-[#E3BBA1] rounded-full"></View>
					) : (
						''
					)} */}
				</View>
			))}
		</View>
	);
};

export default WeeklyCalendar;
