import type { ReactNode, RefObject } from "react";

type GuidedFormShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  progress: { current: number; total: number };
  children: ReactNode;
  footer?: ReactNode;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  className?: string;
};

export function GuidedFormShell({
  eyebrow,
  title,
  description,
  progress,
  children,
  footer,
  headingRef,
  className = "",
}: GuidedFormShellProps) {
  return (
    <section className={`guided-form-shell ${className}`} aria-labelledby="guided-form-title">
      <div className="guided-form-progress" aria-label={`Krok ${progress.current} z ${progress.total}`}>
        <span>Krok {progress.current} z {progress.total}</span>
        <span aria-hidden="true"><span style={{ width: `${(progress.current / progress.total) * 100}%` }} /></span>
      </div>
      <p className="guided-form-eyebrow">{eyebrow}</p>
      <h1 ref={headingRef} id="guided-form-title" tabIndex={-1}>{title}</h1>
      {description ? <p className="guided-form-description">{description}</p> : null}
      <div className="guided-form-content">{children}</div>
      {footer ? <div className="guided-form-footer">{footer}</div> : null}
    </section>
  );
}
