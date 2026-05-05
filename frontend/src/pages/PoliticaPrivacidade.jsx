import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, Database } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function PoliticaPrivacidade() {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className={`${isDark ? 'bg-cereon-green/20' : 'bg-gradient-to-r from-cereon-green to-green-400'} text-white py-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Política de Privacidade
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Sua privacidade é fundamental para nós. Saiba como protegemos e utilizamos seus dados.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-12"
          >
            {/* Introdução */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <Shield className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Nossa Compromisso com sua Privacidade</h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-lg">
                Na Cereon, levamos sua privacidade muito a sério. Esta Política de Privacidade descreve como coletamos, usamos, 
                compartilhamos e protegemos suas informações pessoais quando você utiliza nosso site, produtos e serviços. 
                Estamos comprometidos em garantir transparência e segurança no tratamento de seus dados.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Ao utilizar nossos serviços, você concorda com a coleta e uso de informações de acordo com esta política. 
                Reservamos o direito de atualizar esta política periodicamente para refletir mudanças em nossas práticas 
                ou na legislação aplicável.
              </p>
            </div>

            {/* Dados Coletados */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <Database className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Quais Dados Coletamos</h2>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="text-xl font-semibold text-cereon-dark mb-4">Informações Pessoais</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>Nome completo:</strong> Para identificação e personalização do atendimento</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>E-mail:</strong> Para comunicação, confirmação de pedidos e marketing</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>Telefone:</strong> Para contato sobre pedidos e suporte ao cliente</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>CPF:</strong> Para emissão de notas fiscais e prevenção a fraudes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>Endereço:</strong> Para entrega de produtos e faturamento</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>Data de nascimento:</strong> Para ofertas personalizadas e verificação de idade</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="text-xl font-semibold text-cereon-dark mb-4">Informações de Uso</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>Histórico de navegação:</strong> Para melhorar sua experiência em nosso site</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>Histórico de compras:</strong> Para recomendações personalizadas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>Preferências:</strong> Para personalizar conteúdo e ofertas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">•</span>
                    <span><strong>Dados de dispositivos:</strong> Para compatibilidade e segurança</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Como Usamos os Dados */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <Eye className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Como Utilizamos Seus Dados</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-cereon-light rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-cereon-dark mb-3">Processamento de Pedidos</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Utilizamos suas informações para processar seus pedidos, confirmar compras, 
                    gerar notas fiscais e coordenar a entrega dos produtos.
                  </p>
                </div>
                
                <div className="bg-cereon-light rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-cereon-dark mb-3">Comunicação</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Enviamos confirmações de pedidos, atualizações de entrega, informações 
                    sobre suporte e comunicações relacionadas aos nossos serviços.
                  </p>
                </div>
                
                <div className="bg-cereon-light rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-cereon-dark mb-3">Personalização</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Analisamos suas preferências e histórico para oferecer recomendações 
                    personalizadas e conteúdo relevante para você.
                  </p>
                </div>
                
                <div className="bg-cereon-light rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-cereon-dark mb-3">Marketing</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Com sua autorização, enviamos ofertas especiais, novidades e 
                    conteúdo promocional personalizado por e-mail ou outros canais.
                  </p>
                </div>
              </div>
            </div>

            {/* Compartilhamento de Dados */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Compartilhamento de Dados</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Não vendemos suas informações pessoais para terceiros. Compartilhamos dados apenas nas seguintes situações:
                </p>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-2">Parceiros de Pagamento</h4>
                    <p className="text-gray-600 text-sm">
                      Instituições financeiras e gateways de pagamento para processar transações de forma segura.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-2">Serviços de Entrega</h4>
                    <p className="text-gray-600 text-sm">
                      Transportadoras e serviços logísticos para entregar seus pedidos no endereço informado.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-2">Fornecedores Tecnológicos</h4>
                    <p className="text-gray-600 text-sm">
                      Serviços de hospedagem, analytics e ferramentas que nos ajudam a operar nossa plataforma.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-2">Obrigação Legal</h4>
                    <p className="text-gray-600 text-sm">
                      Quando exigido por lei, ordem judicial ou para proteger nossos direitos e segurança.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Segurança */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <Lock className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Segurança das Informações</h2>
              </div>
              
              <div className="bg-cereon-light rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Implementamos medidas robustas de segurança para proteger suas informações pessoais:
                </p>
                
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">✓</span>
                    <span>Criptografia SSL/TLS em todas as transmissões de dados</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">✓</span>
                    <span>Servidores seguros com monitoramento 24/7</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">✓</span>
                    <span>Acesso restrito às informações por equipe autorizada</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">✓</span>
                    <span>Backup regular e planos de recuperação de dados</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cereon-green mr-2">✓</span>
                    <span>Auditorias regulares de segurança e conformidade</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Cookies */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Uso de Cookies</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Utilizamos cookies e tecnologias similares para melhorar sua experiência:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-cereon-dark mb-2">Cookies Essenciais</h4>
                    <p className="text-gray-600 text-sm">
                      Necessários para o funcionamento básico do site, como login e carrinho de compras.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-cereon-dark mb-2">Cookies de Desempenho</h4>
                    <p className="text-gray-600 text-sm">
                      Ajudam a entender como você usa nosso site para melhorar o desempenho.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-cereon-dark mb-2">Cookies de Funcionalidade</h4>
                    <p className="text-gray-600 text-sm">
                      Lembram suas preferências para proporcionar uma experiência personalizada.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-cereon-dark mb-2">Cookies de Marketing</h4>
                    <p className="text-gray-600 text-sm">
                      Utilizados para mostrar anúncios relevantes com base em seus interesses.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direitos do Usuário */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Seus Direitos</h2>
              
              <div className="space-y-4">
                <div className="border-l-4 border-cereon-green pl-4 py-2">
                  <h4 className="font-semibold text-cereon-dark mb-1">Acesso</h4>
                  <p className="text-gray-600 text-sm">
                    Você tem direito solicitar cópia das suas informações pessoais que mantemos.
                  </p>
                </div>
                
                <div className="border-l-4 border-cereon-green pl-4 py-2">
                  <h4 className="font-semibold text-cereon-dark mb-1">Correção</h4>
                  <p className="text-gray-600 text-sm">
                    Pode solicitar correção de informações imprecisas ou incompletas.
                  </p>
                </div>
                
                <div className="border-l-4 border-cereon-green pl-4 py-2">
                  <h4 className="font-semibold text-cereon-dark mb-1">Exclusão</h4>
                  <p className="text-gray-600 text-sm">
                    Pode solicitar exclusão de seus dados pessoais, respeitadas as obrigações legais.
                  </p>
                </div>
                
                <div className="border-l-4 border-cereon-green pl-4 py-2">
                  <h4 className="font-semibold text-cereon-dark mb-1">Portabilidade</h4>
                  <p className="text-gray-600 text-sm">
                    Tem direito a receber seus dados em formato estruturado e portável.
                  </p>
                </div>
                
                <div className="border-l-4 border-cereon-green pl-4 py-2">
                  <h4 className="font-semibold text-cereon-dark mb-1">Consentimento</h4>
                  <p className="text-gray-600 text-sm">
                    Pode revogar seu consentimento a qualquer momento para processamentos específicos.
                  </p>
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Entre em Contato</h2>
              
              <div className="bg-cereon-light rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Se você tiver dúvidas sobre esta Política de Privacidade ou quiser exercer seus direitos, 
                  entre em contato conosco:
                </p>
                
                <div className="space-y-2 text-gray-600">
                  <p><strong>E-mail:</strong> privacidade@cereon.com.br</p>
                  <p><strong>Telefone:</strong> (11) 3000-0000</p>
                  <p><strong>Horário de atendimento:</strong> Segunda a Sexta, 9h às 18h</p>
                </div>
                
                <p className="text-gray-600 leading-relaxed mt-4">
                  Responderemos sua solicitação em até 15 dias corridos, conforme previsto na Lei Geral 
                  de Proteção de Dados (LGPD).
                </p>
              </div>
            </div>

            {/* Atualização */}
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">
                Esta política foi atualizada em {new Date().toLocaleDateString('pt-BR')} e pode ser 
                modificada a qualquer momento. Alterações significativas serão comunicadas 
                proativamente aos nossos clientes.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
