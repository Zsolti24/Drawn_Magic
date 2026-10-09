import type { ReactNode } from "react";
import { Link } from "react-router";

/** Almenük kerete: cím, vissza gomb a főmenübe, tartalom */
export function PageFrame({ title, children, back = "/" }: { title: string; children: ReactNode; back?: string }) {
  return (
    <main className="page">
      <header className="page__bar">
        <Link className="back-btn" to={back}>
          <span className="back-btn__arrow" aria-hidden="true" />
          Vissza
        </Link>
        <h1 className="title">{title}</h1>
      </header>
      <div className="page__body">{children}</div>
    </main>
  );
}
