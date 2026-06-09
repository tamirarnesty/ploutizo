import { FileText, Upload, X } from 'lucide-react';
import { type DragEvent, useCallback, useId, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Field, FieldLabel } from '@/components/field';
import { cn } from '@/lib/utils';

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

const isAcceptedFile = (file: File, accept: string | undefined): boolean => {
  if (!accept) return true;
  const acceptedTypes = accept.split(',').map((type) => type.trim());
  const fileExtension = `.${file.name.split('.').pop() ?? ''}`;
  return acceptedTypes.some((type) => {
    if (type.startsWith('.')) {
      return fileExtension.toLowerCase() === type.toLowerCase();
    }
    if (type.endsWith('/*')) {
      const baseType = type.split('/')[0];
      return (file.type || '').startsWith(`${baseType}/`);
    }
    return file.type === type;
  });
};

export interface FileFieldProps {
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  invalid?: boolean;
  value: File | null;
  onChange: (file: File | null) => void;
  onError?: (message: string) => void;
  id?: string;
  label?: string;
}

export const FileField = ({
  accept,
  maxSize,
  disabled = false,
  invalid = false,
  value,
  onChange,
  onError,
  id: idProp,
  label = 'File',
}: FileFieldProps) => {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSet = useCallback(
    (file: File | null) => {
      if (!file) {
        onChange(null);
        return;
      }
      if (maxSize !== undefined && file.size > maxSize) {
        onError?.(
          `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`
        );
        return;
      }
      if (!isAcceptedFile(file, accept)) {
        onError?.(`File "${file.name}" is not an accepted file type.`);
        return;
      }
      onChange(file);
    },
    [accept, maxSize, onChange, onError]
  );

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files.item(0);
    if (file) validateAndSet(file);
  };

  const openFileDialog = () => {
    if (!disabled) inputRef.current?.click();
  };

  const clearFile = () => {
    if (inputRef.current) inputRef.current.value = '';
    onChange(null);
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div
        className={cn(
          'flex h-8 min-w-0 items-center rounded-lg border border-input bg-background transition-colors',
          isDragging && 'border-ring ring-3 ring-ring/50',
          disabled && 'cursor-not-allowed bg-input/50 opacity-50',
          invalid && 'border-destructive ring-3 ring-destructive/20'
        )}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDragOver={disabled ? undefined : handleDragOver}
        onDrop={disabled ? undefined : handleDrop}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.item(0) ?? null;
            validateAndSet(file);
          }}
        />
        <button
          type="button"
          className="flex h-full min-w-0 flex-1 items-center gap-2 px-2.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
          disabled={disabled}
          onClick={openFileDialog}
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">
            {value ? value.name : 'Drop file here or browse'}
          </span>
          {value ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatBytes(value.size)}
            </span>
          ) : null}
        </button>
        {value && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="mr-1"
            onClick={clearFile}
          >
            <X />
            <span className="sr-only">Remove file</span>
          </Button>
        ) : (
          <Upload className="mr-2 size-4 shrink-0 text-muted-foreground" />
        )}
      </div>
    </Field>
  );
};
