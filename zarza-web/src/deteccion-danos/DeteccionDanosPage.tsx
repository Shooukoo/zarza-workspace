import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Progress, Space, Tag, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { mensajeDeErrorClasificacion, useClasificarDano } from './useClasificarDano';
import { formatearConfianza, infoClase } from './clases';

const { Title, Text, Paragraph } = Typography;

// Mismos límites que fruit-backend (@fastify/multipart fileSize 5 MB y
// MagicNumberValidator: solo JPG/PNG).
const MAX_BYTES = 5_000_000;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png'];

const CARD_STYLE = { flex: '1 1 280px', maxWidth: 520, minWidth: 0 } as const;

export function DeteccionDanosPage() {
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const clasificar = useClasificarDano();
  const resultadoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!foto) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  // Solo se muestra lo que corresponde a la foto actual: evita que la
  // respuesta de una foto anterior aparezca sobre una recién elegida.
  const esDeFotoActual = clasificar.variables === foto;
  const resultado = esDeFotoActual ? clasificar.data : undefined;
  const error = esDeFotoActual && clasificar.isError ? clasificar.error : null;
  const principal = resultado ? infoClase(resultado.clase) : null;

  // En pantallas angostas las tarjetas se apilan y el resultado puede quedar
  // fuera de la vista: al aparecer, se hace scroll hasta él.
  useEffect(() => {
    if (resultado) {
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [resultado]);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      message.error('Solo se permiten imágenes JPG o PNG.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_BYTES) {
      message.error('La imagen supera el límite de 5 MB.');
      return Upload.LIST_IGNORE;
    }
    clasificar.reset();
    setFoto(file);
    return false; // no subir automáticamente: se envía al pulsar "Analizar"
  };

  function reiniciar() {
    clasificar.reset();
    setFoto(null);
  }

  return (
    <div>
      <Title level={3}>
        Detección de Daños <Tag color="gold">beta</Tag>
      </Title>
      <Paragraph type="secondary">
        Sube una foto de una zarzamora para saber si está sana, dañada o presenta alguna
        enfermedad. Los resultados no se guardan.
      </Paragraph>

      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}
        aria-live="polite"
      >
        <Card style={CARD_STYLE}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Foto seleccionada"
              style={{
                display: 'block',
                width: '100%',
                maxHeight: 420,
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
          ) : (
            <Upload.Dragger
              accept={TIPOS_PERMITIDOS.join(',')}
              multiple={false}
              showUploadList={false}
              beforeUpload={beforeUpload}
            >
              <p style={{ fontSize: 16, margin: '24px 0 8px' }}>
                Haz clic o arrastra una foto aquí
              </p>
              <Text type="secondary">JPG o PNG, máximo 5 MB</Text>
              <div style={{ height: 24 }} />
            </Upload.Dragger>
          )}

          {foto && (
            <Space wrap style={{ marginTop: 16 }}>
              {!resultado && (
                <Button
                  type="primary"
                  loading={clasificar.isPending}
                  onClick={() => clasificar.mutate(foto)}
                >
                  Analizar
                </Button>
              )}
              <Button onClick={reiniciar} disabled={clasificar.isPending}>
                {resultado ? 'Analizar otra foto' : 'Cambiar foto'}
              </Button>
            </Space>
          )}

          {error && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 16 }}
              message={mensajeDeErrorClasificacion(error)}
            />
          )}
        </Card>

        {resultado && principal && (
          <Card ref={resultadoRef} title="Resultado" style={CARD_STYLE}>
            <Space direction="vertical" size={4}>
              <Tag color={principal.tagColor} style={{ fontSize: 18, padding: '4px 12px' }}>
                {principal.etiqueta}
              </Tag>
              <Text type="secondary">
                Confianza: <Text strong>{formatearConfianza(resultado.confianza)}</Text>
              </Text>
            </Space>

            <div style={{ marginTop: 24 }}>
              {resultado.probabilidades.map((p) => {
                const info = infoClase(p.clase);
                return (
                  <div key={p.clase} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>{info.etiqueta}</Text>
                      <Text type="secondary">{formatearConfianza(p.confianza)}</Text>
                    </div>
                    <Progress
                      percent={p.confianza * 100}
                      showInfo={false}
                      strokeColor={info.barColor}
                      size="small"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
