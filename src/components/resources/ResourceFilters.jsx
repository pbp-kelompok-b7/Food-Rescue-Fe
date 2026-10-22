import FormField from '../ui/FormField.jsx'
import Select from '../ui/Select.jsx'
import Button from '../ui/Button.jsx'

// Options come from the page/API, so category and lifecycle rules have one owner.
export default function ResourceFilters({ fields, value, onChange, onReset }) {
  return (
    <div className="fr-resource-filters">
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
