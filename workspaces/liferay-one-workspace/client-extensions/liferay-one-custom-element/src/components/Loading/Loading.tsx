/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLoadingIndicator from '@clayui/loading-indicator';
import classNames from 'classnames';
import {ComponentProps, ReactNode} from 'react';

import './Loading.css';

type LoadingProps = ComponentProps<typeof ClayLoadingIndicator>;

type FullScreenProps = {
	children: ReactNode;
};

type InlineProps = LoadingProps & {
	children?: ReactNode;
};

type PageProps = LoadingProps & {
	fill?: boolean;
};

const Loading: React.FC<LoadingProps> & {
	FullScreen: typeof FullScreen;
	Inline: typeof Inline;
	Page: typeof Page;
} = ({displayType = 'primary', shape = 'squares', size = 'lg', ...props}) => (
	<ClayLoadingIndicator
		displayType={displayType}
		shape={shape}
		size={size}
		{...props}
	/>
);

const FullScreen: React.FC<FullScreenProps> = ({children}) => (
	<div className="loading-overlay">
		<div className="loading-container">
			<div className="loading-text">
				<Loading style={{marginBottom: '2rem'}} />
				<span className="mt-3">{children}</span>
			</div>
		</div>
	</div>
);

const Inline: React.FC<InlineProps> = ({
	children,
	className,
	size = 'sm',
	...props
}) => (
	<span className="loading-inline">
		<Loading
			className={classNames('my-0', className)}
			size={size}
			{...props}
		/>

		{children ? (
			<span className="loading-inline-text">{children}</span>
		) : null}
	</span>
);

const Page: React.FC<PageProps> = ({fill, ...props}) => (
	<div className={classNames('loading-page', {'loading-page-fill': fill})}>
		<Loading {...props} />
	</div>
);

Loading.FullScreen = FullScreen;
Loading.Inline = Inline;
Loading.Page = Page;

export default Loading;
