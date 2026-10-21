import { initialsOf } from "../utils";

interface Props {
  name: string;
  photo?: string | null;
  className: string;
}

/** Round photo when the person has one, initials otherwise. The name is always shown next to it, so the image is decorative. */
export function MeetingAvatar({ name, photo, className }: Props) {
  if (photo) return <img className={className + " is-photo"} src={photo} alt="" />;
  return <span className={className}>{initialsOf(name)}</span>;
}
