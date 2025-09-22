// app/page.jsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

const systemMessage = {
  id: 'system-prompt', // ID único para el mensaje
  role: 'system',
  content: `
    Eres un asistente virtual de turismo experto en la provincia de Tucumán, Argentina.
    Puedes proporcionar información sobre atracciones, transportes, hoteles y alojamiento, alquiler de autos, prestadores de servicios, y artículos de interés.
    Si la persona pregunta algo relacionado a informacion, planear, ayuda, conocer, etc. es necesario que busques sobre artículos.
    buscar algo relacionado a autos es necesario que busques sobre el alquiler de autos. 
    buscar algo relacionado a actividades o turismo aventura es necesario que busques sobre prestadores de servicios.
    buscar sobre alojamiento o hoteles es necesario que busques sobre hoteles.
    buscar sobre viajes guiados, tours o guias turisticos es necesario que busques sobre guías.
    buscar sobre transporte, paradas, viajes, mediso de transporte, colectivos, como llegar a la ciudad, etc. es necesario que busques sobre transporte.
  `,
};

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat({ initialMessages: [systemMessage] });

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap my-2">
          <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
              
              case "step-start":
                return

              // --- RENDERIZADO PARA ARTÍCULOS ---
              case 'tool-ConsultarArticulos':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Aquí tienes algunos artículos relacionados:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(articulo => (
                        <div key={articulo.idArticulo} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>📝 {articulo.nombre}</strong></p>
                          <p className="text-zinc-600 dark:text-zinc-400 mt-1">{articulo.copete}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron artículos con esos criterios.</p>
                    )}
                  </div>
                );

              // --- RENDERIZADO PARA PRESTADORES ---
              case 'tool-ConsultarPrestadores':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Encontré estos prestadores:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(prestador => (
                        <div key={prestador.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>⭐ Título:</strong> {prestador.titulo}</p>
                          <p><strong>🏞️ Actividades:</strong> {prestador.nombres_actividades}</p>
                          <p><strong>👤 Responsable:</strong> {prestador.responsable}</p>
                          <p><strong>📞 Teléfono:</strong> {prestador.telefono_final}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron prestadores con esos criterios.</p>
                    )}
                  </div>
                );
              
              // --- RENDERIZADO PARA GUÍAS ---
              case 'tool-ConsultarGuias':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Estos son los guías que encontré:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(guia => (
                        <div key={guia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>👤 {guia.nombre}</strong></p>
                          <p className="mt-1"><strong>📜 Licencia:</strong> {guia.tipo_registro}</p>
                          <p><strong>🗺️ Opera en:</strong> {guia.zona_operacion}</p>
                          <p><strong>📞 Contacto:</strong> {guia.telefonos || 'No disponible'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron guías con esos criterios.</p>
                    )}
                  </div>
                );

              // --- RENDERIZADO PARA AUTOS ---
              case 'tool-ConsultCars':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Resultados de la búsqueda de autos:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(agencia => (
                        <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
                          <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
                          <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
                    )}
                  </div>
                );

              // --- RENDERIZADO PARA COLECTIVOS ---
              case 'tool-ConsultarColectivos':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Aquí están los itinerarios de colectivos:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(itinerario => (
                        <div key={itinerario.Idtiene} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>🚌 {itinerario.Empresa}</strong> a <strong>{itinerario.nombre_localidad}</strong></p>
                          <p className="mt-1"><strong>🗓️ Días:</strong> {itinerario.dia}</p>
                          <p><strong>➡️ Horarios Ida:</strong> {itinerario.ida.replaceAll(',', ' - ')}</p>
                          <p><strong>⬅️ Horarios Vuelta:</strong> {itinerario.vuelta.replaceAll(',', ' - ')}</p>
                          <p><strong>📍 Plataforma:</strong> {itinerario.Plataforma}</p>
                          <p><strong>💲 Precio:</strong> {itinerario.Precio}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron itinerarios con esos criterios.</p>
                    )}
                  </div>
                );

              // --- RENDERIZADO PARA HOTELES ---
              case 'tool-ConsultarHoteles':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">He encontrado estos hoteles:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(hotel => (
                        <div key={hotel.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>🏨 {hotel.nombre}</strong></p>
                          <p className="mt-1">
                            <strong>⭐ Estrellas:</strong> {'★'.repeat(parseInt(hotel.estrellas, 10)).padEnd(5, '☆')}
                          </p>
                          <p><strong>📍 Domicilio:</strong> {hotel.domicilio}, {hotel.localidad}</p>
                          <p><strong>📞 Teléfono:</strong> {hotel.telefono_final}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron hoteles con esos criterios.</p>
                    )}
                  </div>
                );

              default:
                // Fallback para cualquier otra herramienta no personalizada
                return (
                    <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
                      {JSON.stringify(part, null, 2)}
                    </pre>
                  );
            }
          })}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
          console.log(messages);
        }}
      >
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
          value={input}
          placeholder="Busca artículos, prestadores o agencias..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}

// // app/page.jsx
// 'use client';

// import { useChat } from '@ai-sdk/react';
// import { useState } from 'react';

// export default function Chat() {
//   const [input, setInput] = useState('');
//   const { messages, sendMessage } = useChat();

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap my-2">
//           <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;

//               // --- RENDERIZADO PARA ARTÍCULOS ---
//               case 'tool-ConsultarArticulos':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Aquí tienes algunos artículos relacionados:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(articulo => (
//                         <div key={articulo.idArticulo} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>📝 {articulo.nombre}</strong></p>
//                           <p className="text-zinc-600 dark:text-zinc-400 mt-1">{articulo.copete}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron artículos con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA PRESTADORES ---
//               case 'tool-ConsultarPrestadores':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Encontré estos prestadores:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(prestador => (
//                         <div key={prestador.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>⭐ Título:</strong> {prestador.titulo}</p>
//                           <p><strong>🏞️ Actividades:</strong> {prestador.nombres_actividades}</p>
//                           <p><strong>👤 Responsable:</strong> {prestador.responsable}</p>
//                           <p><strong>📞 Teléfono:</strong> {prestador.telefono_final}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron prestadores con esos criterios.</p>
//                     )}
//                   </div>
//                 );
              
//               // --- RENDERIZADO PARA AUTOS ---
//               case 'tool-ConsultCars':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Resultados de la búsqueda de autos:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(agencia => (
//                         <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
//                           <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
//                           <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               default:
//                 // Fallback para cualquier otra herramienta no personalizada
//                 return (
//                     <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
//                       {JSON.stringify(part, null, 2)}
//                     </pre>
//                   );
//             }
//           })}
//         </div>
//       ))}

//       <form
//         onSubmit={e => {
//           e.preventDefault();
//           if (!input.trim()) return;
//           sendMessage({ text: input });
//           setInput('');
//         }}
//       >
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Busca artículos, prestadores o agencias..."
//           onChange={e => setInput(e.currentTarget.value)}
//         />
//       </form>
//     </div>
//   );
// }

// 'use client';

// import { useChat } from '@ai-sdk/react';
// import { useState } from 'react';

// export default function Chat() {
//   const [input, setInput] = useState('');
//   const { messages, sendMessage } = useChat();

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap my-2">
//           <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;

//               // --- RENDERIZADO PARA PRESTADORES ---
//               case 'tool-ConsultarPrestadores':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Encontré estos prestadores:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(prestador => (
//                         <div key={prestador.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>⭐ Título:</strong> {prestador.titulo}</p>
//                           <p><strong>🏞️ Actividades:</strong> {prestador.nombres_actividades}</p>
//                           <p><strong>👤 Responsable:</strong> {prestador.responsable}</p>
//                           <p><strong>📞 Teléfono:</strong> {prestador.telefono_final}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron prestadores con esos criterios.</p>
//                     )}
//                   </div>
//                 );
              
//               // --- RENDERIZADO PARA AUTOS ---
//               case 'tool-ConsultCars':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Resultados de la búsqueda de autos:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(agencia => (
//                         <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
//                           <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
//                           <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               default:
//                 // Fallback para cualquier otra herramienta no personalizada
//                 return (
//                     <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
//                       {JSON.stringify(part, null, 2)}
//                     </pre>
//                   );
//             }
//           })}
//         </div>
//       ))}

//       <form
//         onSubmit={e => {
//           e.preventDefault();
//           if (!input.trim()) return;
//           sendMessage({ text: input });
//           setInput('');
//         }}
//       >
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Busca agencias de autos o actividades..."
//           onChange={e => setInput(e.currentTarget.value)}
//         />
//       </form>
//     </div>
//   );
// }





// // // app/page.jsx

// // app/page.jsx

// 'use client';

// import { useChat } from '@ai-sdk/react';
// import { useState } from 'react';

// export default function Chat() {
//   const [input, setInput] = useState('');
//   const { messages, sendMessage } = useChat();

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap my-2">
//           <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;

//               // --- INICIO RENDERIZADO PERSONALIZADO PARA ConsultCars ---
//               case 'tool-ConsultCars':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Resultados de la búsqueda:</p>
//                     {/* 👇 CAMBIO AQUÍ: de part.result a part.output */}
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       // 👇 Y CAMBIO AQUÍ: de part.result a part.output
//                       part.output.map(agencia => (
//                         <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
//                           <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
//                           <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
//                     )}
//                   </div>
//                 );
//               // --- FIN RENDERIZADO PERSONALIZADO ---

//               // Renderizado por defecto para las otras herramientas
//               case 'tool-weather':
//               case 'tool-convertFahrenheitToCelsius':
//                 return (
//                   <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
//                     {JSON.stringify(part, null, 2)}
//                   </pre>
//                 );
//               default:
//                 return null;
//             }
//           })}
//         </div>
//       ))}

//       <form
//         onSubmit={e => {
//           e.preventDefault();
//           if (!input.trim()) return;
//           sendMessage({ text: input });
//           setInput('');
//         }}
//       >
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Busca una agencia de autos..."
//           onChange={e => setInput(e.currentTarget.value)}
//         />
//       </form>
//     </div>
//   );
// }





// 'use client';

// import { useChat } from '@ai-sdk/react';
// import { useState } from 'react';

// export default function Chat() {
//   const [input, setInput] = useState('');
//   const { messages, sendMessage } = useChat();

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap">
//           {message.role === 'user' ? 'User: ' : 'AI: '}
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;
//               // 👇 Esta es la línea que cambia
//               case 'tool-weather':
//               case 'tool-convertFahrenheitToCelsius':
//                 return (
//                   <pre key={`${message.id}-${i}`}>
//                     {JSON.stringify(part, null, 2)}
//                   </pre>
//                 );
//             }
//           })}
//         </div>
//       ))}

//       {/* El formulario se mantiene igual */}
//       <form
//         onSubmit={e => {
//           e.preventDefault();
//           sendMessage({ text: input });
//           setInput('');
//         }}
//       >
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Say something..."
//           onChange={e => setInput(e.currentTarget.value)}
//         />
//       </form>
//     </div>
//   );
// }