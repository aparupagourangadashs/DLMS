import { Fragment } from "react";

/** Renders help text where **double asterisks** mark on-screen labels. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export const plainText = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "$1");
