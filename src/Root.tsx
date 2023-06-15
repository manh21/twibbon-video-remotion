import {Composition, Still} from 'remotion';
import {Overlay} from './Overlay';
import { Twibbon } from './Twibbon';
import { PreviewCard } from './PreviewCard';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="Overlay"
				component={Overlay}
				durationInFrames={75}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="Twibbon"
				component={Twibbon}
				durationInFrames={300}
				fps={30}
				width={1080}
				height={1080}
			/>
			<Still
				id="PreviewCard"
				component={PreviewCard}
				width={1200}
				height={627}
				defaultProps={{
					title: 'Welcome to Remotion',
					description: 'Edit Video.tsx to change template',
					slogan: 'Make videos\nprogrammatically',
				}}
			/>
		</>
	);
};
