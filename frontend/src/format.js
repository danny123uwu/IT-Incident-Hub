export const label = (value) => String(value).replaceAll('_', ' ');

export function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
}

export function describeError(error) {
  const details = error.details ? Object.values(error.details).join('. ') : '';
  return details ? `${error.message}: ${details}` : error.message;
}
