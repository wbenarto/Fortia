import Icon from '@/assets/images/icon.png';
import SignUp from '@/assets/images/signup.jpg';
import Person from '@/assets/icons/person.png';
import Lock from '@/assets/icons/lock.png';
import Email from '@/assets/icons/email.png';
import Google from '@/assets/icons/google.png';
import Check from '@/assets/images/check.png';
import Home from '@/assets/icons/home.png';
import Profile from '@/assets/icons/profile.png';
import Chart from '@/assets/images/dummy-chart.png';
import Calendar from '@/assets/icons/calendar.png';

export const images = {
	Icon,
	SignUp,
	Check,
	Chart,
};

export const icons = {
	Icon,
	Person,
	Lock,
	Email,
	Google,
	Home,
	Profile,
	Calendar,
};

export const onboardingPages = [
	{
		id: 1,
		title: 'Welcome to Fortia',
		description: 'Your wellness journey starts here',
		image: images.Icon,
	},
	{
		id: 2,
		title: 'Track and Achieve Your Goals.',
		description:
			'Personalized calorie target, intuitive meal tracking, and activity insights to help you stay on track to reach your goals.',
		image: images.Icon,
	},
	{
		id: 3,
		title: 'Cultivate Calm. Achieve Clarity.',
		description:
			'Access guided meditation, reduce anxiety, and log your focused work to manifest your best self.',
		image: images.Icon,
		isForm: true,
	},
];
