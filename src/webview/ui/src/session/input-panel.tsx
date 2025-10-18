import { useEffect, useState } from "react";

type InputPanelProps = {
  readonly draft: string;
  readonly onSubmit: (text: string) => void;
};

const InputPanel = ({ draft, onSubmit }: InputPanelProps) => {
  const [value, setValue] = useState(draft);

  useEffect(() => {
    setValue(draft);
  }, [draft]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return;
    }
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <form className="session-input session-panel" onSubmit={handleSubmit}>
      <textarea
        className="session-input__textarea"
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask the providers anything..."
        rows={3}
        value={value}
      />
      <div className="session-input__footer">
        <span className="session-input__hint">
          Press Enter to send, Shift+Enter for new line
        </span>
        <button className="session-input__send" type="submit">
          Send
        </button>
      </div>
    </form>
  );
};

export default InputPanel;
