function attendanceVerifiedHoursNormalise(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return String(number);
}

function attendanceVerifiedHoursRefreshButton(input, button) {
  if (!input || !button) return;
  const defaultValue = attendanceVerifiedHoursNormalise(input.dataset.systemHours || 0);
  const currentValue = attendanceVerifiedHoursNormalise(input.value);
  const isAdjusted = currentValue !== defaultValue;
  button.textContent = isAdjusted ? 'Adjust' : 'Verify';
  button.value = isAdjusted ? 'adjust' : 'verify';
}

function attendanceVerifiedHoursPatchAdminRow() {
  if (typeof phaseThreeAdminRow !== 'function' || phaseThreeAdminRow.verifiedHoursDefaultPatched) return;
  const originalAdminRow = phaseThreeAdminRow;

  phaseThreeAdminRow = function patchedPhaseThreeAdminRow(claim) {
    const row = originalAdminRow(claim);
    const input = row.querySelector('input[name="verifiedHours"]');
    const smartButton = row.querySelector('[data-smart-review-action]');
    const systemHours = attendanceVerifiedHoursNormalise(claim?.claimedHours || 0);

    if (input) {
      input.value = systemHours;
      input.dataset.systemHours = systemHours;
      input.placeholder = systemHours;
      input.addEventListener('input', () => attendanceVerifiedHoursRefreshButton(input, smartButton));
    }

    attendanceVerifiedHoursRefreshButton(input, smartButton);
    return row;
  };

  phaseThreeAdminRow.verifiedHoursDefaultPatched = true;
}

document.addEventListener('DOMContentLoaded', () => {
  attendanceVerifiedHoursPatchAdminRow();
  if (typeof phaseThreeRender === 'function') phaseThreeRender();
});
