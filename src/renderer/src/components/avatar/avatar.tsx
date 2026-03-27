import { PersonIcon } from "@primer/octicons-react";
import cn from "classnames";

import "./avatar.scss";

export interface AvatarProps
  extends Omit<
    React.DetailedHTMLProps<
      React.ImgHTMLAttributes<HTMLImageElement>,
      HTMLImageElement
    >,
    "src"
  > {
  size: number;
  src?: string | null;
}

export function Avatar({ size, alt, src, className, ...props }: AvatarProps) {
  if (!src) {
    // sem foto: ícone simples igual ao de notificações (16px)
    return <PersonIcon size={16} />;
  }

  return (
    <div className="profile-avatar" style={{ width: size, height: size }}>
      <img
        className={cn("profile-avatar__image", className)}
        alt={alt}
        src={src}
        width={size}
        height={size}
        {...props}
      />
    </div>
  );
}
