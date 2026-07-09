// assets/icons/HomeIcon.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

const HomeIcon = (props:any) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
    <Path
      d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"
      fill="currentColor"
    />
  </Svg>
);

export default HomeIcon;
