import { useEffect } from 'react';
import {
  Modal,
  Row,
  Col,
  Image,
  Skeleton,
  Descriptions,
  InputNumber,
  Input,
  Form,
  Button,
  Typography,
  Space,
  message,
} from 'antd';
import { useAnalisisDetail, useAnalisisImage, useValidateAnalisis } from './useAnalisis';
import type { CronogramaCorregido } from './types';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const { Text } = Typography;

interface Props {
  analysisId: string | null;
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  etapas: Record<string, number>;
  observaciones: string;
}

export function AnalisisDetailModal({ analysisId, open, onClose }: Props) {
  const { user } = useAuth();
  const isAgronomo = user?.role === Role.AGRONOMO;
  const isProductor = user?.role === Role.PRODUCTOR;

  const detailQuery = useAnalisisDetail(analysisId);
  const imageQuery = useAnalisisImage(analysisId);
  const validateMutation = useValidateAnalisis();
  const [form] = Form.useForm<FormValues>();

  const analysis = detailQuery.data;

  useEffect(() => {
    if (!analysis) return;

    const source =
      analysis.validacion_experto?.cronograma_corregido &&
      analysis.validacion_experto.cronograma_corregido.length > 0
        ? analysis.validacion_experto.cronograma_corregido
        : analysis.cronograma_fenologico;

    const etapas: Record<string, number> = {};
    source.forEach((e) => { etapas[e.etapa] = e.cantidad; });

    form.setFieldsValue({
      etapas,
      observaciones: analysis.validacion_experto?.observaciones ?? '',
    });
  }, [analysis, form]);

  async function onFinish(values: FormValues) {
    if (!analysisId || !analysis) return;

    const cronograma_corregido: CronogramaCorregido[] = analysis.cronograma_fenologico.map(
      (e) => ({ etapa: e.etapa, cantidad: values.etapas[e.etapa] ?? e.cantidad }),
    );

    try {
      await validateMutation.mutateAsync({
        id: analysisId,
        payload: {
          action: 'rechazado',
          cronograma_corregido,
          observaciones: values.observaciones,
        },
      });
      message.success('Corrección guardada exitosamente');
      onClose();
    } catch {
      message.error('Error al guardar la corrección');
    }
  }

  return (
    <Modal
      title="Detalle del Análisis"
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      destroyOnClose
    >
      {detailQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !analysis ? null : (
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={24}>
            <Col xs={24} md={10}>
              {imageQuery.isLoading ? (
                <Skeleton.Image style={{ width: '100%', height: 280 }} active />
              ) : imageQuery.data?.url ? (
                <Image
                  src={imageQuery.data.url}
                  alt="Análisis"
                  style={{ width: '100%', borderRadius: 8 }}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 280,
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                  }}
                >
                  <Text type="secondary">Imagen no disponible</Text>
                </div>
              )}

              {analysis.fecha_analisis && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  Fecha: {new Date(analysis.fecha_analisis).toLocaleDateString('es-MX')}
                </Text>
              )}
            </Col>

            <Col xs={24} md={14}>
              <Text strong>Métricas del modelo IA</Text>
              {analysis.metricas_salud ? (
                <Descriptions column={2} size="small" style={{ marginTop: 8, marginBottom: 16 }}>
                  <Descriptions.Item label="Total detectados">
                    {analysis.metricas_salud.total_elementos_detectados}
                  </Descriptions.Item>
                  <Descriptions.Item label="Sanos">
                    {analysis.metricas_salud.elementos_sanos}
                  </Descriptions.Item>
                  <Descriptions.Item label="Enfermos">
                    {analysis.metricas_salud.elementos_enfermos}
                  </Descriptions.Item>
                  <Descriptions.Item label="Merma %">
                    {analysis.metricas_salud.porcentaje_merma_general?.toFixed(1)}%
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Text type="secondary">Sin métricas</Text>
              )}

              <Text strong>Cronograma fenológico (modelo IA)</Text>
              <div style={{ marginTop: 8 }}>
                {analysis.cronograma_fenologico.map((e) => (
                  <Space key={e.etapa} style={{ display: 'flex', marginBottom: 4 }}>
                    <Text style={{ minWidth: 120 }}>{e.etapa}:</Text>
                    <Text>{e.cantidad} unidades</Text>
                  </Space>
                ))}
              </div>
            </Col>
          </Row>

          {!isProductor && (
          <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Text strong>
              {isAgronomo ? 'Corrección del diagnóstico' : 'Corrección registrada'}
            </Text>

            <div style={{ marginTop: 12 }}>
              {analysis.cronograma_fenologico.map((e) => (
                <Form.Item
                  key={e.etapa}
                  label={`${e.etapa} — cantidad corregida`}
                  name={['etapas', e.etapa]}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <InputNumber min={0} style={{ width: 120 }} disabled={!isAgronomo} />
                </Form.Item>
              ))}

              <Form.Item
                label="Observaciones"
                name="observaciones"
                rules={[{ required: true, message: 'Ingresa observaciones' }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Describe la corrección realizada..."
                  disabled={!isAgronomo}
                />
              </Form.Item>

              {isAgronomo && (
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={validateMutation.isPending}
                >
                  Guardar corrección
                </Button>
              )}
            </div>
          </div>
          )}
        </Form>
      )}
    </Modal>
  );
}
