import React from 'react';
import { Text, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-5">
      <View className="flex-row items-center mb-3">
        <MaterialCommunityIcons name={icon as any} size={22} color="#6b6b5a" />
        <Text className="text-[18px] font-sans-bold text-text ml-3">{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function Paragraph({ text }: { text: string }) {
  return (
    <Text className="text-[15px] font-sans text-text-secondary leading-6 mb-2">
      {text}
    </Text>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View className="flex-row ml-2 mb-2">
      <Text className="text-[15px] font-sans text-text-secondary mr-2">{'\u2022'}</Text>
      <Text className="text-[15px] font-sans text-text-secondary leading-6 flex-1">{text}</Text>
    </View>
  );
}

function ImportantBox({ text }: { text: string }) {
  return (
    <View className="rounded-2xl bg-primary-50 p-4 mt-3 mb-2" style={{ borderWidth: 1, borderColor: '#FFD60030' }}>
      <Text className="text-[14px] font-sans-bold text-text leading-5">{text}</Text>
    </View>
  );
}

export default function TermsOfServiceScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeArea>
      <Header
        title={t('settings.termsOfService')}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-sans text-text-secondary mb-5">
          Última atualização: março de 2026
        </Text>

        <Section icon="handshake-outline" title="1. Aceitação dos Termos">
          <Paragraph text="Ao baixar, instalar ou utilizar o aplicativo O Meu Banco, você concorda com estes Termos de Uso. Se você não concordar com algum destes termos, não utilize o aplicativo." />
        </Section>

        <Section icon="information-outline" title="2. Descrição do Serviço">
          <Paragraph text="O Meu Banco é um simulador educacional de controle de mesada infantil. O app foi criado para ajudar famílias a ensinar conceitos de educação financeira para crianças de forma lúdica e segura." />
          <ImportantBox text="IMPORTANTE: O Meu Banco NÃO é um banco real, instituição financeira ou aplicativo de pagamentos. O app NÃO movimenta dinheiro real, NÃO realiza transações financeiras e NÃO está vinculado a nenhuma conta bancária." />
        </Section>

        <Section icon="account-child-outline" title="3. Uso Destinado">
          <Paragraph text="O Meu Banco é destinado para uso por:" />
          <BulletItem text="Pais e responsáveis legais que desejam ensinar educação financeira aos seus filhos" />
          <BulletItem text="Crianças, sob supervisão e consentimento dos pais/responsáveis" />
          <Paragraph text="O uso do app por menores de idade deve ser sempre supervisionado e autorizado por um pai ou responsável legal." />
        </Section>

        <Section icon="shield-account-outline" title="4. Responsabilidades dos Pais">
          <Paragraph text="Ao usar o app, os pais/responsáveis se comprometem a:" />
          <BulletItem text="Supervisionar o uso do app pelos seus filhos" />
          <BulletItem text="Fornecer informações precisas ao criar perfis de crianças" />
          <BulletItem text="Gerenciar adequadamente as funcionalidades de mesada" />
          <BulletItem text="Manter a segurança do acesso ao app (PIN e biometria)" />
          <BulletItem text="Entender que o app é um simulador educacional e não substitui orientação financeira profissional" />
        </Section>

        <Section icon="lock-outline" title="5. Conta e Autenticação">
          <Paragraph text="O acesso ao app é feito através de autenticação via Passkey, vinculada ao email do pai/responsável. Você é responsável por manter a segurança do seu dispositivo e do acesso ao app." />
        </Section>

        <Section icon="copyright" title="6. Propriedade Intelectual">
          <Paragraph text="Todo o conteúdo do app O Meu Banco, incluindo mas não limitado a textos, gráficos, logos, ícones, imagens, interface de usuário e código fonte, é propriedade da Paleta Fosforescente, LDA e está protegido pelas leis de propriedade intelectual aplicáveis." />
          <Paragraph text="É proibido copiar, modificar, distribuir, vender ou explorar comercialmente qualquer parte do app sem autorização prévia e por escrito." />
        </Section>

        <Section icon="alert-circle-outline" title="7. Limitação de Responsabilidade">
          <Paragraph text='O Meu Banco é fornecido "como está" e "conforme disponível". A Paleta Fosforescente, LDA não garante que:' />
          <BulletItem text="O app estará disponível ininterruptamente" />
          <BulletItem text="O app estará livre de erros ou defeitos" />
          <BulletItem text="Os resultados educacionais atingirão expectativas específicas" />
          <Paragraph text="Em nenhuma circunstância a Paleta Fosforescente, LDA será responsável por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso ou incapacidade de uso do app." />
        </Section>

        <Section icon="pencil-outline" title="8. Modificações">
          <Paragraph text="Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer funcionalidade do app a qualquer momento. Notificaremos os usuários sobre alterações significativas nestes termos através do app ou por email." />
        </Section>

        <Section icon="close-circle-outline" title="9. Rescisão">
          <Paragraph text="Você pode encerrar sua conta a qualquer momento solicitando a exclusão dos seus dados. Reservamo-nos o direito de encerrar ou suspender o acesso ao app em caso de violação destes termos." />
        </Section>

        <Section icon="scale-balance" title="10. Lei Aplicável">
          <Paragraph text="Estes termos são regidos pelas leis aplicáveis na jurisdição da Paleta Fosforescente, LDA. Qualquer disputa será resolvida nos tribunais competentes dessa jurisdição." />
        </Section>

        <Section icon="email-outline" title="11. Contato">
          <Paragraph text="Para dúvidas sobre estes Termos de Uso, entre em contato:" />
          <BulletItem text="Email: suporte@omeubanco.xyz" />
          <BulletItem text="Empresa: Paleta Fosforescente, LDA" />
        </Section>
      </ScrollView>
    </SafeArea>
  );
}
