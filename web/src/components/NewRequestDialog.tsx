import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { Preset } from '../types';
import { Button, Field, Modal, Select, Spinner, Textarea } from '../ui';

export function NewRequestDialog({
  open,
  onClose,
  presets,
}: {
  open: boolean;
  onClose: () => void;
  presets: Preset[];
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [preset, setPreset] = useState(presets[0]?.id ?? '');
  const [purpose, setPurpose] = useState('');

  const m = useMutation({
    mutationFn: () => api.createRequest(preset, purpose.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      setPurpose('');
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('form.title')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={m.isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => m.mutate()} disabled={!preset || !purpose.trim() || m.isPending}>
            {m.isPending ? <Spinner className="h-4 w-4" /> : null}
            {m.isPending ? t('form.submitting') : t('form.submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('form.preset')}>
          <Select value={preset} onChange={(e) => setPreset(e.target.value)}>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('form.purpose')}>
          <Textarea
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder={t('form.purposePlaceholder')}
          />
        </Field>
        {m.isError && <p className="text-sm text-red-600">{t('common.error')}</p>}
      </div>
    </Modal>
  );
}
