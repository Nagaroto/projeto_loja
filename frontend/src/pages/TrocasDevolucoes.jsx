import React from 'react';
import { motion } from 'framer-motion';
import { Package, RefreshCw, CreditCard, Truck, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function TrocasDevolucoes() {
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
              Trocas e Devoluções
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Satisfação garantida. Conheça nossa política de trocas e devoluções para comprar com confiança.
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
            {/* Prazo para Troca/Devolução */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <Clock className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Prazo para Troca e Devolução</h2>
              </div>
              
              <div className="bg-cereon-light rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed text-lg mb-4">
                  Você tem <strong>7 dias corridos</strong> após o recebimento do produto para solicitar troca ou devolução.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-4 border border-cereon-green/20">
                    <h3 className="font-semibold text-cereon-dark mb-2">Troca</h3>
                    <p className="text-gray-600 text-sm">
                      Solicite troca por outro tamanho, cor ou modelo, 
                      sujeito à disponibilidade de estoque.
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-cereon-green/20">
                    <h3 className="font-semibold text-cereon-dark mb-2">Devolução</h3>
                    <p className="text-gray-600 text-sm">
                      Solicite reembolso total ou parcial do valor 
                      pago, conforme condições do produto.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Condições do Produto */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <Package className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Condições do Produto</h2>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Para que sua solicitação seja aceita, o produto deve atender às seguintes condições:
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-cereon-green mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Sem Uso</h4>
                      <p className="text-gray-600 text-sm">
                        Produto não pode ter sinais de uso, lavagem, alterações ou danos.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-cereon-green mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Embalagem Original</h4>
                      <p className="text-gray-600 text-sm">
                        Deve ser devolvido com todas as embalagens, tags, etiquetas e acessórios originais.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-cereon-green mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Nota Fiscal</h4>
                      <p className="text-gray-600 text-sm">
                        Nota fiscal original deve acompanhar o produto para processamento.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-cereon-green mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-cereon-dark mb-1">Integridade</h4>
                      <p className="text-gray-600 text-sm">
                        Produto deve estar em perfeitas condições, sem manchas, rasgos ou alterações.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Procedimento para Solicitar */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <RefreshCw className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Como Solicitar Troca ou Devolução</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-cereon-light rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-cereon-dark mb-4">Passo a Passo</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="bg-cereon-green text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-cereon-dark mb-1">Entre em Contato</h4>
                        <p className="text-gray-600 text-sm">
                          Envie um e-mail para <strong>devolucoes@cereon.com.br</strong> 
                          com seu número de pedido e motivo da solicitação.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-cereon-green text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-cereon-dark mb-1">Aguarde Análise</h4>
                        <p className="text-gray-600 text-sm">
                          Nossa equipe analisará sua solicitação em até 48 horas úteis 
                          e retornará com as instruções.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-cereon-green text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-cereon-dark mb-1">Prepare o Produto</h4>
                        <p className="text-gray-600 text-sm">
                          Embale o produto adequadamente com todas as etiquetas e acessórios originais.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-cereon-green text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h4 className="font-semibold text-cereon-dark mb-1">Envie o Produto</h4>
                        <p className="text-gray-600 text-sm">
                          Envie para o endereço fornecido. O frete é por nossa conta 
                          para produtos com defeito ou erro de envio.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-cereon-green text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                        5
                      </div>
                      <div>
                        <h4 className="font-semibold text-cereon-dark mb-1">Aguarde Processamento</h4>
                        <p className="text-gray-600 text-sm">
                          Após recebimento, o produto será analisado em até 5 dias úteis. 
                          Se aprovado, a troca ou reembolso será processado.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Produtos com Defeito */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Produtos com Defeito</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start mb-4">
                  <AlertCircle className="w-5 h-5 text-cereon-green mr-3 mt-0.5" />
                  <p className="text-gray-600 leading-relaxed">
                    Se você receber um produto com defeito de fabricação, oferecemos soluções especiais:
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-cereon-green/20">
                    <h4 className="font-semibold text-cereon-dark mb-2">Reparo</h4>
                    <p className="text-gray-600 text-sm">
                      Enviamos para conserto especializado sem custo para você.
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-cereon-green/20">
                    <h4 className="font-semibold text-cereon-dark mb-2">Substituição</h4>
                    <p className="text-gray-600 text-sm">
                      Trocamos por um produto novo e idêntico, se disponível.
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-cereon-green/20">
                    <h4 className="font-semibold text-cereon-dark mb-2">Reembolso</h4>
                    <p className="text-gray-600 text-sm">
                      Devolução integral do valor pago, incluindo frete.
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mt-4 italic">
                  Defeitos de fabricação têm garantia estendida de 90 dias após o recebimento.
                </p>
              </div>
            </div>

            {/* Reembolso */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <CreditCard className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Reembolso</h2>
              </div>
              
              <div className="bg-cereon-light rounded-lg p-6">
                <h3 className="text-xl font-semibold text-cereon-dark mb-4">Formas e Prazos</h3>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Cartão de Crédito</h4>
                    <p className="text-gray-600 text-sm">
                      O valor será estornado na mesma fatura (se possível) ou na próxima fatura seguinte. 
                      Prazo: até 2 faturas, dependendo da operadora.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Cartão de Débito</h4>
                    <p className="text-gray-600 text-sm">
                      Estorno na conta corrente vinculada. Prazo: até 10 dias úteis.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">PIX</h4>
                    <p className="text-gray-600 text-sm">
                      Transferência imediata para a mesma chave utilizada no pagamento. 
                      Prazo: até 24 horas após aprovação.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">Boleto Bancário</h4>
                    <p className="text-gray-600 text-sm">
                      Depósito bancário ou TED. Prazo: até 5 dias úteis após fornecimento dos dados.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-cereon-green pl-4">
                    <h4 className="font-semibold text-cereon-dark mb-1">PayPal</h4>
                    <p className="text-gray-600 text-sm">
                      Reembolso na conta PayPal. Prazo: até 3 dias úteis.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-white rounded-lg border border-cereon-green/20">
                  <p className="text-gray-600 text-sm">
                    <strong>Importante:</strong> O reembolso será processado somente após 
                    confirmação do recebimento e aprovação do produto devolvido.
                  </p>
                </div>
              </div>
            </div>

            {/* Custos de Envio */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cereon-green/10 rounded-full">
                  <Truck className="w-6 h-6 text-cereon-green" />
                </div>
                <h2 className="text-3xl font-bold text-cereon-dark">Custos de Envio</h2>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Frete Grátis por Nossa Conta:</h4>
                    <ul className="space-y-1 text-green-700 text-sm">
                      <li>• Produtos com defeito de fabricação</li>
                      <li>• Erro no envio (produto errado ou tamanho incorreto)</li>
                      <li>• Produtos danificados durante o transporte</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2">Frete por Conta do Cliente:</h4>
                    <ul className="space-y-1 text-yellow-700 text-sm">
                      <li>• Troca por tamanho ou cor diferente</li>
                      <li>• Arrependimento de compra (direito de arrependimento)</li>
                      <li>• Produto que não atendeu às expectativas</li>
                    </ul>
                    <p className="text-yellow-700 text-sm mt-2">
                      Neste caso, o frete do novo produto (em caso de troca) é por nossa conta.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Exceções */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Produtos Não Elegíveis</h2>
              
              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <p className="text-red-800 font-semibold mb-3">Não aceitamos trocas ou devoluções de:</p>
                
                <ul className="space-y-2 text-red-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Produtos íntimos por questões de higiene</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Produtos personalizados ou sob medida</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Itens vendidos em promoção com condições especiais</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Produtos com danos causados pelo cliente</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Peças com mais de 7 dias do recebimento</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Produtos sem embalagem ou etiquetas originais</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Dicas Adicionais */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Dicas Importantes</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-cereon-light rounded-lg p-4">
                  <h4 className="font-semibold text-cereon-dark mb-2">📸 Tire Fotos</h4>
                  <p className="text-gray-600 text-sm">
                    Fotografe o produto antes de enviar para comprovar 
                    o estado em que se encontra.
                  </p>
                </div>
                
                <div className="bg-cereon-light rounded-lg p-4">
                  <h4 className="font-semibold text-cereon-dark mb-2">📦 Embalagem Segura</h4>
                  <p className="text-gray-600 text-sm">
                    Use uma embalagem adequada para proteger o produto 
                    durante o transporte de devolução.
                  </p>
                </div>
                
                <div className="bg-cereon-light rounded-lg p-4">
                  <h4 className="font-semibold text-cereon-dark mb-2">🏷️ Mantenha as Tags</h4>
                  <p className="text-gray-600 text-sm">
                    Não remova etiquetas e tags até ter certeza 
                    de que ficará com o produto.
                  </p>
                </div>
                
                <div className="bg-cereon-light rounded-lg p-4">
                  <h4 className="font-semibold text-cereon-dark mb-2">📞 Mantenha Contato</h4>
                  <p className="text-gray-600 text-sm">
                    Acompanhe sua solicitação através do e-mail 
                    ou WhatsApp para atualizações rápidas.
                  </p>
                </div>
              </div>
            </div>

            {/* Contato para Suporte */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-cereon-dark">Suporte ao Cliente</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed mb-4">
                  Se você tiver qualquer dúvida sobre nossa política de trocas e devoluções, 
                  nossa equipe está pronta para ajudar:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-cereon-dark mb-2">📧 E-mail</h4>
                    <p className="text-gray-600 text-sm mb-1">devolucoes@cereon.com.br</p>
                    <p className="text-gray-500 text-xs">Resposta em até 24 horas</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-cereon-dark mb-2">📞 Telefone</h4>
                    <p className="text-gray-600 text-sm mb-1">(11) 3000-0000</p>
                    <p className="text-gray-500 text-xs">Segunda a Sexta, 9h às 18h</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-cereon-dark mb-2">💬 WhatsApp</h4>
                    <p className="text-gray-600 text-sm mb-1">(11) 9 8000-0000</p>
                    <p className="text-gray-500 text-xs">Atendimento rápido e prático</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-cereon-dark mb-2">💬 Chat Online</h4>
                    <p className="text-gray-600 text-sm mb-">Disponível no site</p>
                    <p className="text-gray-500 text-xs">Segunda a Sábado, 9h às 21h</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações Finais */}
            <div className="bg-cereon-light rounded-lg p-6 text-center">
              <p className="text-gray-600 leading-relaxed mb-4">
                Na Cereon, sua satisfação é nossa prioridade. Trabalhamos para garantir 
                que sua experiência de compra seja sempre positiva, desde a escolha do produto 
                até o pós-venda.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Esta política está em conformidade com o Código de Defesa do Consumidor 
                e foi atualizada em {new Date().toLocaleDateString('pt-BR')}.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
