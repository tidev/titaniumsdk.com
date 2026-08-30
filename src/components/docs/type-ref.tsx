import type { TypeRef } from '@/lib/registry';
import { Fragment } from 'react';

/**
 * Renders a parsed type reference, linking the parts that name a real type.
 *
 * The registry stores these structurally rather than as strings precisely so
 * that `Dictionary<Titanium.UI.View>` can link its argument without linking the
 * wrapper.
 */
export function TypeRefText({ refs, base }: { refs: TypeRef[] | undefined; base: string }) {
  if (!refs?.length) return null;
  return (
    <>
      {refs.map((ref, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-text-subtle"> | </span>}
          <One ref_={ref} base={base} />
        </Fragment>
      ))}
    </>
  );
}

function One({ ref_, base }: { ref_: TypeRef; base: string }) {
  if (ref_.kind === 'generic') {
    return (
      <>
        <span>{ref_.name}</span>
        <span className="text-text-subtle">{'<'}</span>
        {ref_.args.map((a, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-text-subtle">, </span>}
            <One ref_={a} base={base} />
          </Fragment>
        ))}
        <span className="text-text-subtle">{'>'}</span>
      </>
    );
  }

  if (ref_.kind === 'type') {
    return (
      <a href={`${base}/${ref_.name}`} className="text-link hover:underline">
        {ref_.name}
      </a>
    );
  }

  return <span>{ref_.name}</span>;
}
