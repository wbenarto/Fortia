// Web / server stand-in for react-native-pager-view, which is native-only.
// The production build also bundles the app for the API routes (web.output: 'server');
// without this the import in app/progress.tsx fails that step. The iOS app uses the real package.
const React = require('react');
const { View } = require('react-native');

class PagerView extends React.Component {
	setPage() {}
	setPageWithoutAnimation() {}
	setScrollEnabled() {}
	render() {
		const { children, style } = this.props;
		const first = React.Children.toArray(children)[0] ?? null;
		return React.createElement(View, { style }, first);
	}
}

module.exports = PagerView;
module.exports.default = PagerView;
