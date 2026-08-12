"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type StaticLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * GitHub Pages serves this app as pre-rendered HTML. Using a regular anchor
 * keeps every navigation as a document request instead of asking for an RSC
 * payload that does not exist on static hosting.
 */
export default function StaticLink({ href, children, onClick, target, ...props }: StaticLinkProps) {
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      target === "_blank" ||
      props.download != null ||
      !href.startsWith("/") || href.startsWith("//")
    ) return;

    event.preventDefault();
    event.stopPropagation();
    window.location.assign(href);
  };

  return <a href={href} target={target} onClick={navigate} {...props}>{children}</a>;
}
