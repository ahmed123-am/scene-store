import React, { useId } from 'react';

const sliceCount = 18;
const sliceWidth = 1200 / sliceCount;

export default function WaveTitle({ text }) {
  const id = useId().replaceAll(':', '');

  return (
    <svg
      viewBox="0 0 1200 250"
      preserveAspectRatio="none"
      className="wave-title"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {Array.from({ length: sliceCount }, (_, index) => (
          <clipPath id={id + '-' + index} key={index}>
            <rect x={index * sliceWidth - 0.5} y="0" width={sliceWidth + 1} height="250" />
          </clipPath>
        ))}
      </defs>

      {Array.from({ length: sliceCount }, (_, index) => (
        <g clipPath={'url(#' + id + '-' + index + ')'} key={index}>
          <text
            x="600"
            y="210"
            textAnchor="middle"
            direction="rtl"
            textLength="1120"
            lengthAdjust="spacingAndGlyphs"
            className="wave-title-slice"
            style={{ '--slice-delay': (sliceCount - 1 - index) * 22 + 'ms' }}
          >
            {text}
          </text>
        </g>
      ))}
    </svg>
  );
}
