// import { openai } from '@ai-sdk/openai';
// import {
//   streamText,
//   convertToModelMessages,
//   tool,
//   generateObject, // Importamos 'generateObject' para la lógica de filtrado
// } from 'ai';
// import { z } from 'zod';

// export const maxDuration = 30;

// export async function POST(req) {
//   const { messages } = await req.json();

//   const result = streamText({
//     model: openai('gpt-4o-mini'),
//     messages: convertToModelMessages(messages),
//     toolChoice: 'required',
//     tools: {
//       // --- Herramienta de Búsqueda Principal ---
//       // ConsultarArticulos: tool({
//       //   description: 'Busca artículos o notas en el sitio de turismo por un término clave. Útil para consultas directas.',
//       //   inputSchema: z.object({
//       //     busqueda: z.string().describe('La palabra o frase a buscar.'),
//       //   }),
//       //   execute: async ({ busqueda }) => {
//       //     const baseUrl = 'http://10.15.15.151/api/api/buscador';
//       //     const params = new URLSearchParams({ busqueda, limit: '10', idioma: 'ES' });
//       //     const fullUrl = `${baseUrl}?${params.toString()}`;
//       //     console.log(`BÚSQUEDA NORMAL: ${fullUrl}`);
//       //     try {
//       //       const response = await fetch(fullUrl);
//       //       const data = await response.json();
//       //       return data.result;
//       //     } catch (error) {
//       //       return { error: 'No se pudo realizar la búsqueda principal.' };
//       //     }
//       //   },
//       // }),

//       // --- NUEVA Herramienta de Búsqueda y Filtrado Inteligente ---
//       busqueda_filtrado: tool({
//         description: 'Usar cuando una búsqueda anterior falló o dio resultados ambiguos. Analiza los parámetros de la búsqueda fallida, ejecuta una nueva búsqueda y filtra los resultados para encontrar los 3 artículos más relevantes.',
//         inputSchema: z.object({
//           original_query: z.string().describe('La pregunta original y completa del usuario. Ejemplo: "parapente en tafi".'),
//           failed_input: z.object({
//             busqueda: z.string(),
//             localidad: z.string().optional(),
//           }).describe('El objeto "input" del tool-call anterior que no arrojó buenos resultados.'),
//         }),
//         execute: async ({ original_query, failed_input }) => {
//           console.log("Mensajes: ", messages);
//           // 1. Transforma el input fallido en un string de búsqueda
//           const searchString = Object.values(failed_input).join(' ');
//           console.log(`FILTRADO - Nuevo string de búsqueda: "${searchString}"`);

//           // 2. Llama a la API con el nuevo string
//           const baseUrl = 'http://10.15.15.151/api/api/buscador';
//           const params = new URLSearchParams({ busqueda: searchString, limit: '10', idioma: 'ES' });
//           const fullUrl = `${baseUrl}?${params.toString()}`;
          
//           let apiResponse;
//           try {
//             const response = await fetch(fullUrl);
//             apiResponse = await response.json();
//             console.log(`FILTRADO - Resultados de la API: ${JSON.stringify(apiResponse)}`);
//             if (!apiResponse.result || apiResponse.result.length === 0) {
//               return { error: 'La búsqueda filtrada no encontró resultados para analizar.' };
//             }
//           } catch (error) {
//             return { error: 'Error al conectar con la API en la búsqueda filtrada.' };
//           }

//           // 3. Llama a la IA internamente para que analice y destile los IDs
//           try {
//             console.log('FILTRADO - Pidiendo a la IA que analice los resultados...');
//             const { object } = await generateObject({
//               model: openai('gpt-4o-mini'),
//               schema: z.object({
//                 ids: z.array(z.number().int()).length(3).describe('Un array con los 3 IDs de artículo más relevantes.'),
//               }),
//               prompt: `Basado en la pregunta original del usuario "${original_query}", analiza el siguiente JSON de resultados de búsqueda y extrae los 3 "idArticulo" más relevantes. Resultados: ${JSON.stringify(apiResponse.result)}`,
//             });

//             // 4. Muestra en consola y devuelve el array de IDs
//             console.log('FILTRADO - IDs de artículos más relevantes:', object.ids);
//             return { "IDs de Artículos Filtrados": object.ids };

//           } catch (error) {
//             console.error('FILTRADO - Error en el análisis de la IA:', error);
//             return { error: 'La IA no pudo procesar los resultados de la búsqueda.' };
//           }
//         },
//       }),
//     },
//   });

//   return result.toUIMessageStreamResponse();
// }

import { openai } from '@ai-sdk/openai';
import {
  streamText,
  convertToModelMessages,
  tool,
} from 'ai';
import { z } from 'zod';

// Permite que las respuestas de streaming duren hasta 30 segundos
export const maxDuration = 30;

export async function POST(req) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages: convertToModelMessages(messages),
    toolChoice: 'required',
    tools: {
      // --- Herramienta de Búsqueda Profunda (Fallback) ---
      // La IA usará esta herramienta si la búsqueda principal falla o si la pregunta es muy abstracta.
      buscador_inDeepth: tool({
        description: 'Utiliza esta herramienta únicamente cuando una búsqueda anterior no arrojó resultados. Analiza la pregunta original del usuario para destilarla a una única palabra clave o concepto fundamental relacionado con el turismo en Tucumán. Por ejemplo, si la consulta original era "dónde puedo encontrar un sommelier en tucumán", la palabra clave a buscar debería ser "vino".',
        inputSchema: z.object({
          keyword: z.string().describe('La palabra clave, destilada de la pregunta original del usuario que falló. Debe ser un concepto general y amplio. Ejemplo: "vino", "montaña", "historia".'),
        }),
        execute: async ({ keyword }) => {
          const baseUrl = 'http://10.15.15.151/api/api/buscador';
           const params = new URLSearchParams({
            busqueda: keyword, // Usamos el keyword destilado para la búsqueda
            limit: '10',
            offset: '0',
            idioma: 'ES',
          });
          
          const fullUrl = `${baseUrl}?${params.toString()}`;
          console.log(`BÚSQUEDA PROFUNDA con keyword: ${fullUrl}`);

           try {
            const response = await fetch(fullUrl);
            if (!response.ok) {
              throw new Error(`Error de red: ${response.statusText}`);
            }
            const data = await response.json();
            return data.result;
          } catch (error) {
            console.error('Error en buscador_inDeepth:', error);
            return { error: 'La búsqueda profunda no pudo realizarse.' };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
