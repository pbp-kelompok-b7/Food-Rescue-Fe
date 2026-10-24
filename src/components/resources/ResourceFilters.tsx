import FormField from '../ui/FormField.tsx'
import Select from '../ui/Select.tsx'
import Button from '../ui/Button.tsx'

// Options come from the page/API, so category and lifecycle rules have one owner.
export default function ResourceFilters({ fields, value, onChange, onReset }: { fields: { name: string; label: string; options: {value: string; label: string; disabled?: boolean}[]; placeholder?: string }[]; value: Record<string, string>; onChange: (value: Record<string, string>) => void; onReset?: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      {fields.map((field) => (
        <FormField key={field.name} label={field.label}>
          <Select
            value={value[field.name] ?? ''}
            options={field.options}
            placeholder={field.placeholder || 'Semua'}
            onChange={(event) =>
              onChange({ ...value, [field.name]: event.target.value })
            }
          />
        </FormField>
      ))}
      {onReset && (
        <Button variant="ghost" onClick={onReset}>
          Reset filter
        </Button>
      )}
    </div>
  )
}
