import type { ApiLinker } from '@/lib/docs/links';
import type { TypeRef } from '@/lib/registry';
import { Fragment } from 'react';

/**
 * Renders a parsed type reference, linking the parts that name a real type.
 *
 * The registry stores these structurally rather than as strings precisely so
 * that `Dictionary<Titanium.UI.View>` can link its argument without linking the
 * wrapper.
 */
export function TypeRefText({ refs, link }: { refs: TypeRef[] | undefined; link: ApiLinker }) {
  if (!refs?.length) return null;
  return (
    <>
      {refs.map((ref, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-text-subtle"> | </span>}
          <One ref_={ref} link={link} />
        </Fragment>
      ))}
    </>
  );
}

function One({ ref_, link }: { ref_: TypeRef; link: ApiLinker }) {
  if (ref_.kind === 'generic') {
    return (
      <>
        <span>{ref_.name}</span>
        <span className="text-text-subtle">{'<'}</span>
        {ref_.args.map((a, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-text-subtle">, </span>}
            <One ref_={a} link={link} />
          </Fragment>
        ))}
        <span className="text-text-subtle">{'>'}</span>
      </>
    );
  }

  if (ref_.kind === 'type') {
    const href = link(ref_.name);
    // A type the tree does not render — a pseudo-type folded into its referent —
    // still names something real, so the name stays and the link goes.
    if (href) {
      return (
        <a href={href} className="text-link hover:underline">
          {ref_.name}
        </a>
      );
    }
  }

  return <span>{ref_.name}</span>;
}
