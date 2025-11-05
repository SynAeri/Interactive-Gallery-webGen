import React from 'react';
import { Joystick as ReactJoystick } from 'react-joystick-component';

function Joystick({ onMove, onStop, onLook, onLookStop}){
  return(
  <>
  <div style={{
        position: 'absolute',
        bottom: '50px',
        left: '50px',
        zIndex: 10,
  }}>
    <ReactJoystick
          size={100}
          baseColor="rgba(255, 255, 255, 0.2)"
          stickColor="rgba(255, 255, 255, 0.5)"
          move={onMove}
          stop={onStop}
    />
  </div>
      <div style={{
        position: 'absolute',
        bottom: '50px',
        right: '50px',
        zIndex: 10,
      }}>
        <ReactJoystick
          size={100}
          baseColor="rgba(255, 255, 255, 0.2)"
          stickColor="rgba(255, 255, 255, 0.5)"
          move={onLook} 
          stop={onLookStop} 
        />
      </div>
  </>
  );
}

export default Joystick;
