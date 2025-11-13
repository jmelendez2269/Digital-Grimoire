import { Mark, mergeAttributes } from '@tiptap/core';

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (attrs: { title: string; slug: string }) => ReturnType;
      toggleWikiLink: (attrs: { title: string; slug: string }) => ReturnType;
      unsetWikiLink: () => ReturnType;
    };
  }
}

export const WikiLink = Mark.create<WikiLinkOptions>({
  name: 'wikiLink',
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: { class: 'text-amber-400 hover:underline cursor-pointer' },
    };
  },

  addAttributes() {
    return {
      title: { default: null },
      slug: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wikilink]'
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-wikilink': 'true',
        'data-wikilink-title': HTMLAttributes?.title ?? '',
        'data-wikilink-slug': HTMLAttributes?.slug ?? '',
      }),
      `[[${HTMLAttributes.title || HTMLAttributes.slug}]]`,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        attrs => ({ chain }) => {
          return chain().setMark(this.name, attrs).run();
        },
      toggleWikiLink:
        attrs => ({ chain }) => {
          return chain().toggleMark(this.name, attrs).run();
        },
      unsetWikiLink: () => ({ chain }) => {
        return chain().unsetMark(this.name).run();
      },
    };
  },

  addInputRules() {
    // Match [[Page Name]]
    const wikiRegex = /\[\[([^\]]+)\]\]$/;
    return [
      {
        find: wikiRegex,
        handler: ({ range, match, chain }: { range: any; match: RegExpMatchArray; chain: any }) => {
          const title = match[1].trim();
          const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .slice(0, 64);
          chain()
            .deleteRange(range)
            .setTextSelection(range.from)
            .insertContent(title)
            .setTextSelection({ from: range.from, to: range.from + title.length })
            .setMark(this.name, { title, slug })
            .setTextSelection(range.from + title.length)
            .run();
        },
      } as any,
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        // On Cmd/Ctrl+Enter, if selection has a wikilink, emit navigation/create event
        const { state } = this.editor;
        const { from, to } = state.selection;
        let found = false;
        state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
          // no-op (mark-level inspection happens via storedMarks)
        });
        const marks = state.storedMarks || state.selection.$from.marks();
        const mark = marks.find(m => m.type.name === this.name);
        if (mark) {
          found = true;
          const { title, slug } = mark.attrs as any;
          if (process.env.NODE_ENV !== 'production') {
            console.info('[WikiLinkExtension] wikilink-activate', { title, slug });
          }
          document.dispatchEvent(new CustomEvent('wikilink-activate', { detail: { title, slug } }));
        }
        return found;
      },
    };
  },
});

export default WikiLink;


