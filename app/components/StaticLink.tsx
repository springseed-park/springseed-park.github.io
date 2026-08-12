import type { AnchorHTMLAttributes, ReactNode } from "react";

type StaticLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * GitHub Pages serves this app as pre-rendered HTML. Using a regular anchor
 * keeps every navigation as a document request instead of asking for an RSC
 * payload that does not exist on static hosting.
 */
export default function StaticLink({ href, children, ...props }: StaticLinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
