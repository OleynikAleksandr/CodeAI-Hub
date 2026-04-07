import type { HTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type FileLinkTarget, resolveFileLinkTarget } from "./file-link-target";

interface MarkdownContentProps {
  readonly allowEmphasis?: boolean;
  readonly className?: string;
  readonly content: string;
  readonly id?: string;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
}

const MarkdownContent = ({
  className,
  content,
  id,
  allowEmphasis = true,
  onFileLinkActivate,
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
          a: ({ node: _node, href, ...props }) => {
            const resolvedHref = href ?? "#";
            const fileLinkTarget =
              typeof href === "string" ? resolveFileLinkTarget(href) : null;
            return (
              <a
                {...props}
                href={resolvedHref}
                onClick={(event) => {
                  props.onClick?.(event);
                  if (event.defaultPrevented) {
                    return;
                  }
                  if (!(fileLinkTarget && onFileLinkActivate)) {
                    return;
                  }
                  event.preventDefault();
                  onFileLinkActivate(fileLinkTarget);
                }}
                rel="noreferrer"
                target="_blank"
              />
            );
          },
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
