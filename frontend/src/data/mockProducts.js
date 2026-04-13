import cereonImg from '../imgs/cereon.webp';

// Dados mockados de produtos
export const mockProducts = [
  {
    id: 1,
    name: 'Camiseta Premium Cereon',
    price: 129.90,
    image: cereonImg,
    category: 'Camisetas',
    description: 'Camiseta premium de algodão 100% de alta qualidade. Perfeita para o dia a dia com conforto máximo e design elegante.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Branco', 'Preto', 'Verde', 'Cinza'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 2,
    name: 'Calça Jeans Slim Fit',
    price: 189.90,
    image: cereonImg,
    category: 'Calças',
    description: 'Calça jeans slim fit com acabamento premium. Tecido denim 100% algodão, confortável e durável.',
    sizes: ['32', '34', '36', '38', '40', '42'],
    colors: ['Azul Claro', 'Azul Escuro', 'Preto', 'Cinza'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 3,
    name: 'Jaqueta De Couro Elegante',
    price: 349.90,
    image: cereonImg,
    category: 'Jaquetas',
    description: 'Jaqueta de couro sintético com design elegante. Ideal para criar looks sofisticados e modernos.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Preto', 'Marrom', 'Vermelho'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 4,
    name: 'Sneaker Branco Moderno',
    price: 199.90,
    image: cereonImg,
    category: 'Calçados',
    description: 'Sneaker branco com sola confortável. Perfeito para uso casual e esportivo.',
    sizes: ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42'],
    colors: ['Branco', 'Branco/Cinza', 'Branco/Preto'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 5,
    name: 'Vestido Midi Elegante',
    price: 259.90,
    image: cereonImg,
    category: 'Vestidos',
    description: 'Vestido midi elegante com corte impecável. Ideal para ocasiões especiais e eventos.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Preto', 'Vermelho', 'Azul Marinho', 'Beige'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 6,
    name: 'Moletom Conforto',
    price: 159.90,
    image: cereonImg,
    category: 'Moletom',
    description: 'Moletom de algodão macio e confortável. Perfeito para dias frios e relaxamento.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Cinza', 'Preto', 'Azul', 'Verde'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 7,
    name: 'Blazer Executivo',
    price: 289.90,
    image: cereonImg,
    category: 'Blazer',
    description: 'Blazer executivo para looks profissionais. Tecido de qualidade com corte impecável.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Preto', 'Cinza', 'Azul Marinho', 'Marrom'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 8,
    name: 'Shorts Jeans Premium',
    price: 119.90,
    image: cereonImg,
    category: 'Shorts',
    description: 'Shorts jeans premium com acabamento impecável. Confortável e versátil.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Azul Claro', 'Azul Escuro', 'Preto'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 9,
    name: 'Camiseta Básica Cereon',
    price: 99.90,
    image: cereonImg,
    category: 'Camisetas',
    description: 'Camiseta básica essencial para o guarda-roupa. Algodão 100% de alta qualidade.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Branco', 'Preto', 'Cinza', 'Bege'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 10,
    name: 'Calça Skinny Preta',
    price: 169.90,
    image: cereonImg,
    category: 'Calças',
    description: 'Calça skinny preta com acabamento elegante. Tecido comfortável e resistente.',
    sizes: ['32', '34', '36', '38', '40'],
    colors: ['Preto'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 11,
    name: 'Jaqueta Denim Azul',
    price: 279.90,
    image: cereonImg,
    category: 'Jaquetas',
    description: 'Jaqueta denim azul clássica. Perfeita para criar looks casuais e modernos.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Azul Claro', 'Azul Escuro', 'Preto'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 12,
    name: 'Ténis Running Performance',
    price: 249.90,
    image: cereonImg,
    category: 'Calçados',
    description: 'Tênis running com tecnologia de amortecimento. Ideal para treinos e corridas.',
    sizes: ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42'],
    colors: ['Preto', 'Cinza', 'Azul/Preto'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 13,
    name: 'Vestido Festa Preto',
    price: 349.90,
    image: cereonImg,
    category: 'Vestidos',
    description: 'Vestido de festa preto sofisticado. Perfeito para eventos e ocasiões especiais.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Preto'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 14,
    name: 'Moletom Com Capuz',
    price: 199.90,
    image: cereonImg,
    category: 'Moletom',
    description: 'Moletom com capuz de algodão premium. Confortável e quente para dias frios.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Cinza', 'Preto', 'Verde', 'Azul Marinho'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 15,
    name: 'Blazer Feminino Elegant',
    price: 329.90,
    image: cereonImg,
    category: 'Blazer',
    description: 'Blazer feminino elegante com corte sofisticado. Ideal para looks profissionais.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Preto', 'Cinza Claro', 'Azul Marinho', 'Rosa Bebê'],
    images: [cereonImg, cereonImg, cereonImg]
  },
  {
    id: 16,
    name: 'Shorts De Seda Premium',
    price: 149.90,
    image: cereonImg,
    category: 'Shorts',
    description: 'Shorts de seda premium com acabamento luxuoso. Perfeito para looks elegantes.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Preto', 'Champagne', 'Marrom'],
    images: [cereonImg, cereonImg, cereonImg]
  },
];

export const categories = [
  'Todos',
  'Camisetas',
  'Calças',
  'Jaquetas',
  'Calçados',
  'Vestidos',
  'Moletom',
  'Blazer',
  'Shorts'
];
