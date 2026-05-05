import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ShoppingCart, Gavel, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function TermosUso() {
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
              Termos de Uso
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Conheça as regras e condições para utilizar nossos serviços de forma segura e transparente.
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
            {/* Aceitação dos Termos */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <FileText className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Aceitação dos Termos</h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-lg">
                Ao acessar e utilizar o site Cereon, você concorda integralmente com estes Termos de Uso. 
                Se você não concorda com qualquer parte destes termos, não utilize nossos serviços.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Estes termos constituem um acordo legalmente vinculativo entre você e a Cereon. 
                Reservamos o direito de modificar estes termos a qualquer momento, sendo que as alterações 
                entrarão em vigor imediatamente após sua publicação no site.
              </p>
            </div>

            {/* Uso do Site */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <ShoppingCart className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Uso do Site</h2>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="text-xl font-semibold text-cereon-dark mb-4">Regras de Utilização</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <span className="text-cereon-green mr-3 mt-1">✓</span>
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Uso Responsável</h4>
                      <p className="text-gray-600 text-sm">
                        O site deve ser utilizado para fins legais e de acordo com estas condições. 
                        É proibido qualquer uso que viole leis ou direitos de terceiros.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="text-cereon-green mr-3 mt-1">✓</span>
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Conteúdo</h4>
                      <p className="text-gray-600 text-sm">
                        Não é permitido reproduzir, modificar, distribuir ou explorar comercialmente 
                        qualquer conteúdo do site sem autorização prévia e por escrito.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="text-cereon-green mr-3 mt-1">✓</span>
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Segurança</h4>
                      <p className="text-gray-600 text-sm">
                        É proibido tentar acessar áreas restritas, interferir no funcionamento 
                        do site ou introduzir malware, vírus ou outros códigos maliciosos.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="text-cereon-green mr-3 mt-1">✓</span>
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Conduta</h4>
                      <p className="text-gray-600 text-sm">
                        Mantenha uma conduta respeitosa em todas as interações. 
                        Abuso, assédio ou comportamento ofensivo resultarão em suspensão imediata.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cadastro do Usuário */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Cadastro do Usuário</h2>
              
              <div className="bg-cereon-light rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Para realizar compras e acessar recursos exclusivos, você precisa criar uma conta:
                </p>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Informações Verídicas</h4>
                    <p className="text-gray-600 text-sm">
                      Você é responsável por fornecer informações verdadeiras, precisas e completas 
                      durante o cadastro e mantê-las atualizadas.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Segurança da Conta</h4>
                    <p className="text-gray-600 text-sm">
                      Você é responsável pela confidencialidade de sua senha e por todas as atividades 
                      realizadas em sua conta. Não compartilhe suas credenciais de acesso.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Maioridade</h4>
                    <p className="text-gray-600 text-sm">
                      Você deve ser maior de 18 anos ou ter autorização dos responsáveis legais 
                      para criar uma conta e realizar compras em nosso site.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Conta Única</h4>
                    <p className="text-gray-600 text-sm">
                      É permitida apenas uma conta por pessoa. Contas duplicadas podem ser 
                      suspensas ou canceladas sem aviso prévio.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Produtos e Preços */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Produtos e Preços</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="p-2 bg-cereon-green/10 rounded-full mr-3">
                      <AlertCircle className="w-4 h-4 text-cereon-green" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Disponibilidade</h4>
                      <p className="text-gray-600 text-sm">
                        Todos os produtos estão sujeitos à disponibilidade de estoque. 
                        Reservamo-nos o direito de limitar quantidades por cliente.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="p-2 bg-cereon-green/10 rounded-full mr-3">
                      <AlertCircle className="w-4 h-4 text-cereon-green" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Preços</h4>
                      <p className="text-gray-600 text-sm">
                        Os preços estão sujeitos a alteração sem aviso prévio. 
                        O preço válido é o informado no momento da finalização da compra.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="p-2 bg-cereon-green/10 rounded-full mr-3">
                      <AlertCircle className="w-4 h-4 text-cereon-green" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Informações dos Produtos</h4>
                      <p className="text-gray-600 text-sm">
                        Envidamos esforços para fornecer descrições precisas, 
                        mas não garantimos que as cores apareçam idênticas em todos os dispositivos.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="p-2 bg-cereon-green/10 rounded-full mr-3">
                      <AlertCircle className="w-4 h-4 text-cereon-green" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Promoções</h4>
                      <p className="text-gray-600 text-sm">
                        Promoções e descontos são válidos por tempo limitado e não são cumulativos, 
                        salvo indicação em contrário nos termos específicos de cada campanha.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagamento e Envio */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Pagamento e Envio</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-cereon-light rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-cereon-dark mb-3">Formas de Pagamento</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• Cartão de crédito (até 12x sem juros)</li>
                    <li>• Cartão de débito</li>
                    <li>• PIX (pagamento instantâneo)</li>
                    <li>• Boleto bancário (até 3 dias para compensação)</li>
                    <li>• PayPal</li>
                  </ul>
                  <p className="text-gray-600 text-sm mt-3">
                    Todas as transações são processadas por sistemas seguros 
                    e criptografados para proteger seus dados financeiros.
                  </p>
                </div>
                
                <div className="bg-cereon-light rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-cereon-dark mb-3">Prazos de Entrega</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• Região Sudeste: 3-5 dias úteis</li>
                    <li>• Região Sul: 4-7 dias úteis</li>
                    <li>• Região Nordeste: 5-8 dias úteis</li>
                    <li>• Região Centro-Oeste: 4-6 dias úteis</li>
                    <li>• Região Norte: 7-12 dias úteis</li>
                  </ul>
                  <p className="text-gray-600 text-sm mt-3">
                    Prazos contados a partir da aprovação do pagamento 
                    e sujeitos a variações logísticas.
                  </p>
                </div>
              </div>
            </div>

            {/* Propriedade Intelectual */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Propriedade Intelectual</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Todo o conteúdo deste site, incluindo但不限于:
                </p>
                
                <ul className="space-y-2 text-gray-600 mb-4">
                  <li>• Logotipos, marcas e nomes comerciais</li>
                  <li>• Textos, imagens, vídeos e áudios</li>
                  <li>• Design, layout e interface</li>
                  <li>• Códigos-fonte e tecnologias</li>
                  <li>• Base de dados e informações compiladas</li>
                </ul>
                
                <p className="text-gray-600 leading-relaxed font-semibold">
                  São propriedade exclusiva da Cereon ou de seus licenciadores e estão protegidos 
                  pelas leis de direitos autorais e propriedade intelectual.
                </p>
                
                <p className="text-gray-600 leading-relaxed mt-4">
                  Qualquer uso não autorizado constitui violação de direitos autorais 
                  e estará sujeito às penalidades cabíveis.
                </p>
              </div>
            </div>

            {/* Limitação de Responsabilidade */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <Gavel className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Limitação de Responsabilidade</h2>
              </div>
              
              <div className="bg-cereon-light rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Na máxima extensão permitida pela lei:
                </p>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Disponibilidade do Serviço</h4>
                    <p className="text-gray-600 text-sm">
                      Não garantimos que o site estará disponível 100% do tempo. 
                      Podemos realizar manutenções programadas ou enfrentar interrupções técnicas.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Danos Indiretos</h4>
                    <p className="text-gray-600 text-sm">
                      Não somos responsáveis por danos indiretos, incidentais, 
                      consequenciais ou punitivos decorrentes do uso do site.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Terceiros</h4>
                    <p className="text-gray-600 text-sm">
                      Não somos responsáveis por conteúdos, produtos ou serviços 
                      fornecidos por terceiros acessados através de links em nosso site.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Força Maior</h4>
                    <p className="text-gray-600 text-sm">
                      Não somos responsáveis por falhas no cumprimento de obrigações 
                      decorrentes de eventos de força maior ou caso fortuito.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modificações dos Termos */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Modificações dos Termos</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. 
                  As modificações entrarão em vigor imediatamente após sua publicação no site.
                </p>
                
                <p className="text-gray-600 leading-relaxed mb-4">
                  Alterações significativas serão comunicadas através de:
                </p>
                
                <ul className="space-y-2 text-gray-600">
                  <li>• Aviso em destaque no site</li>
                  <li>• E-mail para usuários cadastrados</li>
                  <li>• Notificação em sua próxima visita</li>
                </ul>
                
                <p className="text-gray-600 leading-relaxed mt-4">
                  O uso continuado do site após modificações constitui aceitação 
                  dos novos termos. Caso discorde das alterações, você deve cessar 
                  o uso de nossos serviços.
                </p>
              </div>
            </div>

            {/* Legislação Aplicável */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Legislação Aplicável</h2>
              
              <div className="bg-cereon-light rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
                  Quaisquer disputas serão resolvidas exclusivamente no Foro da Comarca 
                  de São Paulo, Estado de São Paulo.
                </p>
                
                <p className="text-gray-600 leading-relaxed mb-4">
                  Estes termos não afetam seus direitos como consumidor, 
                  garantidos pelo Código de Defesa do Consumidor e outras 
                  legislações aplicáveis.
                </p>
                
                <p className="text-gray-600 leading-relaxed">
                  Se alguma disposição destes termos for considerada inválida 
                  ou inexequível, as demais disposições permanecerão em pleno vigor e efeito.
                </p>
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Dúvidas e Contato</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Se você tiver alguma dúvida sobre estes Termos de Uso, 
                  entre em contato conosco:
                </p>
                
                <div className="space-y-2 text-gray-600">
                  <p><strong>E-mail:</strong> juridico@cereon.com.br</p>
                  <p><strong>Telefone:</strong> (11) 3000-0000</p>
                  <p><strong>Horário de atendimento:</strong> Segunda a Sexta, 9h às 18h</p>
                </div>
              </div>
            </div>

            {/* Data de Atualização */}
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
