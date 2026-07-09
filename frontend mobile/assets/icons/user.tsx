// assets/icons/UserIcon.tsx
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

const UserIcon = (props:any) => (
  <Svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={24} height={24} {...props}>
    <Circle cx="12" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
    <Path
      d="M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </Svg>
);

export default UserIcon;
