// Bảng màu chung cho mọi scene — giữ tông sáng, dịu, hợp với giao diện.

export const P = {
  // Trời
  sky0: '#CFE4F5', sky1: '#DAEBF7', sky2: '#E6F1F8', sky3: '#F1F2EA', sky4: '#FAEBD3',
  sun: '#FFF7DC', sunGlow: '#FDEFC8', sunGlow2: '#FBE6BC',
  cloud: '#FFFFFF', cloudShade: '#E4EEF6',
  // Thành phố
  cityFar: '#C7D8E7', cityFarWin: '#DCE8F2',
  cityMid: '#AFC6DA', cityMidWin: '#D3E2EE', cityMidLit: '#F2F7FB',
  cityNear: '#93AFC8', cityNearWin: '#C4D7E7', cityNearLit: '#FFF4D6',
  // Nước
  water0: '#BFDDF0', water1: '#AED3EB', water2: '#9CC7E4', water3: '#8BBBDD',
  waterShine: '#FFF4D8', waterLine: '#D5EAF6',
  reflect: '#A9C8DF',
  // Cây, cỏ
  leaf0: '#3F7A4A', leaf1: '#56935A', leaf2: '#72AD66', leaf3: '#98C97F', leaf4: '#BFE09A',
  leafShadow: '#356541', leafHighlight: '#D0E8A4',
  grass0: '#5C9A55', grass1: '#79B46A', grass2: '#A2D089', grassShadow: '#4B854B',
  hillFar: '#BCD9CF', hillMid: '#9BC9A4', hillNear: '#7DB77F',
  trunk: '#8A5A3B', trunkDark: '#6B432B',
  path: '#F1DDB0', pathShade: '#E3C993',
  // Nhà
  roof: '#E0533D', roofDark: '#B93E2E', roofLight: '#F07A5E', roofShade: '#CA4937',
  wall: '#FBF1DF', wallShade: '#EAD9BE',
  door: '#9A6440', window: '#9ED3F0', windowFrame: '#FFFFFF',
  // Người
  skin: '#F4C9A6', skinShade: '#DCA482', skinDark: '#C98F68',
  hairDark: '#2C2522', hairBrown: '#5A3A2A', hairGray: '#C9CCD1', hairGrayShade: '#A7ABB2',
  shirtBlue: '#4A7FC1', shirtBlueShade: '#3A68A3', shirtLight: '#E3ECF6', shirtLightShade: '#BCCBDD',
  shirtGreen: '#4FA37A', shirtRed: '#E06A5B', shirtYellow: '#F6C54E', shirtPink: '#F2A2A8',
  pants: '#3D4C66', pantsShade: '#2E3A50',
  outline: '#3A4B5E',
  // Đồ vật
  wood: '#B07B4F', woodDark: '#80563A', woodLight: '#CC9868',
  mug: '#FFFFFF', mugShade: '#D3DCE6', coffee: '#6E4630', steam: '#FFFFFF',
  paper: '#FFFFFF', paperShade: '#E6ECF3', calHead: '#5B8FE0', calHeadDark: '#3F73C6',
  calCell: '#D5E3F5', clockRed: '#E5484D', clockFace: '#FFFFFF',
  ink: '#34465A',
} as const;
