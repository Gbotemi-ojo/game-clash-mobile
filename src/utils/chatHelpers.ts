// src/utils/chatHelpers.ts

export const safeParseDate = (dateInput: any) => {
  if (!dateInput || dateInput === '{}' || dateInput === '[object Object]') return null;
  let d = new Date(dateInput);
  if (!isNaN(d.getTime())) return d;
  if (typeof dateInput === 'string') {
    d = new Date(dateInput.replace(' ', 'T') + (dateInput.includes('Z') ? '' : 'Z'));
    if (!isNaN(d.getTime())) return d;
    if (/^\d+$/.test(dateInput)) {
      d = new Date(parseInt(dateInput, 10));
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
};
  
export const sanitizeDateToISO = (val: any) => {
  const d = safeParseDate(val);
  return d ? d.toISOString() : new Date().toISOString();
};
  
export const formatTime = (dateInput: any) => {
  const d = safeParseDate(dateInput);
  if (!d) return '';
  
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
};
  
export const formatDatePill = (dateInput: any) => {
  const d = safeParseDate(dateInput);
  if (!d) return '';
  
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};
  
export const getTick = (status: string) => {
  if (status === 'sent') return '✓';
  if (status === 'delivered') return '✓✓';
  if (status === 'read') return '✓✓';
  if (status === 'failed') return '⚠';
  return '○';
};
