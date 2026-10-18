import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function ChevronRightIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m6 3.5 4.5 4.5L6 12.5" /></svg>;
}

export function ChevronsLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 3.5 3 8l3.5 4.5" />
      <path d="M12.5 3.5 9 8l3.5 4.5" />
    </svg>
  );
}

export function ChevronsRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 3.5 7 8l-3.5 4.5" />
      <path d="M9.5 3.5 13 8l-3.5 4.5" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M8 3.5v9M3.5 8h9" /></svg>;
}

export function MoreIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <circle cx="3.5" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="12.5" cy="8" r="1" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 4.5h10M5 4.5V3.2c0-.4.3-.7.7-.7h4.6c.4 0 .7.3.7.7v1.3" />
      <path d="M4.2 4.5l.6 7.6c0 .5.4.9.9.9h4.6c.5 0 .9-.4.9-.9l.6-7.6" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m4 4 8 8M12 4l-8 8" /></svg>;
}

export function RestoreIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6.5 4-3.5 3.5L6.5 11" />
      <path d="M3 7.5h6.7a2.8 2.8 0 0 1 2.8 2.8V14" />
    </svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 2.5h5l3 3v8a.7.7 0 0 1-.7.7H4a.7.7 0 0 1-.7-.7V3.2c0-.4.3-.7.7-.7Z" />
      <path d="M9 2.5V6h3.3" />
    </svg>
  );
}
