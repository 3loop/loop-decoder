'use client'

import Editor from '@monaco-editor/react'

interface CodeBlockProps {
  language: string
  value?: string
  readonly?: boolean
  lineNumbers?: boolean
  onChange?: (value: string) => void
}

export default function CodeBlock(props: CodeBlockProps) {
  return (
    <div className="flex-1 border rounded-md overflow-hidden">
      <Editor
        language={props.language}
        value={props.value}
        onChange={(value) => {
          if (value !== undefined) {
            props?.onChange && props?.onChange(value)
          }
        }}
        options={{
          readOnly: props?.readonly ?? false,
          lineNumbers: props?.lineNumbers ? 'on' : 'off',
          automaticLayout: true,
          glyphMargin: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: 'none',
          scrollbar: {
            verticalScrollbarSize: 5,
            horizontalScrollbarSize: 5,
          },
          padding: {
            top: 4,
            bottom: 4,
          },
          hideCursorInOverviewRuler: true,
          lineDecorationsWidth: 10,
          overviewRulerLanes: 0,
          contextmenu: true,
        }}
      />
    </div>
  )
}
