import type { HTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  readonly allowEmphasis?: boolean;
  readonly className?: string;
  readonly content: string;
  readonly id?: string;
}

const MarkdownContent = ({
  className,
  content,
  id,
  allowEmphasis = true,
}: MarkdownContentProps) => {
  const renderPlainText = ({
    node: _node,
    ...props
  }: { node?: unknown } & HTMLAttributes<HTMLElement>) => {
    const { style: _ignoredStyle, ...rest } = props;
    return (
      <span
        {...rest}
        style={{
          fontStyle: "normal",
          fontWeight: 200,
        }}
      />
    );
  };

  return (
    <div className={className} id={id}>
      <ReactMarkdown
        components={{
          a: ({ node: _node, href, ...props }) => (
            <a {...props} href={href ?? "#"} rel="noreferrer" target="_blank" />
          ),
          p: ({ node: _node, ...props }) => <p {...props} />,
          strong: allowEmphasis
            ? ({ node: _node, ...props }) => <strong {...props} />
            : renderPlainText,
          em: allowEmphasis
            ? ({ node: _node, ...props }) => <em {...props} />
            : renderPlainText,
        }}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
