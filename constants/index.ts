import Icon from '@/assets/images/icon.png';
import SignUp from '@/assets/images/signup.jpg';
import Person from '@/assets/icons/person.png';
import Lock from '@/assets/icons/lock.png';
import Email from '@/assets/icons/email.png';
import Google from '@/assets/icons/google.png';
import Apple from '@/assets/icons/google.png'; // Using Google icon as placeholder for Apple
import Check from '@/assets/images/check.png';
import Home from '@/assets/icons/home.png';
import Profile from '@/assets/icons/profile.png';
import Chart from '@/assets/images/dummy-chart.png';
import Calendar from '@/assets/icons/calendar.png';
import Logo from '@/assets/images/logo-main-fortia.png';
import Onboarding1 from '@/assets/images/onboarding-1.png';
import Onboarding2 from '@/assets/images/onboarding-2.png';
import FortiaLogo from '@/assets/images/logo-main-fortia.png';

export const images = {
	Icon,
	SignUp,
	Check,
	Chart,
	Logo,
	Onboarding1,
	Onboarding2,
	FortiaLogo,
};

export const icons = {
	Icon,
	Person,
	Lock,
	Email,
	Google,
	Apple,
	Home,
	Profile,
	Calendar,
	Logo,
};

export const onboardingPages = [
	{
		id: 1,
		title: '',
		description: '',
		image: images.FortiaLogo,
	},
	{
		id: 2,
		title: 'Track and Achieve Your Goals.',
		description:
			'Personalized calorie target, intuitive meal tracking, and activity insights to help you stay on track to reach your goals.',
		image: images.Onboarding1,
	},
	{
		id: 3,
		title: 'Cultivate Calm. Achieve Clarity.',
		description:
			'Access guided meditation, reduce anxiety, and log your focused work to manifest your best self.',
		image: images.Onboarding2,
		isForm: true,
	},
];
