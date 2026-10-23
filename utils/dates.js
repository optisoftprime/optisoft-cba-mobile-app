export function formatFullDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return (
    date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) +
    ', ' +
    date.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  );
}

export const formatPaymentDate = (dateString) => {
  if (!dateString) return '--';

  const date = new Date(dateString);

  const time = date
    .toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();

  const day = date.getDate();

  const month = date.toLocaleString('en-GB', {
    month: 'short',
  });

  const year = date.getFullYear();

  return ` ${day} ${month} ${year}`;
};

//Format date for api to return dd-MM-yyyy

export const formatDOBForApi = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};
