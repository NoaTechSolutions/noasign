# Panel Extraction Guide — NTSsign Design System FASE 3

**Versión:** 1.0
**Fecha:** 2026-05-10
**Basado en:** POC BillingPanel (ETAPA 3)

---

## 🎯 QUÉ ES ESTE DOCUMENTO

Esta guía documenta el patrón para extraer panels del monolito `dashboard-sidebar-demo.tsx` (10,089 LOC) a archivos independientes usando `ModuleLayout` para uniformidad visual.

**Para quién:**
- Desarrolladores agregando nuevos panels
- Desarrolladores migrando panels existentes
- Code reviewers validando extracciones

**Cuándo usarlo:**
- Antes de extraer cualquier panel del monolito
- Al agregar un nuevo módulo al dashboard
- Para entender la arquitectura del dashboard

---

## ✅ LECCIONES APRENDIDAS DEL POC (BillingPanel)

### 1. Dependencias Compartidas Son Comunes

**Realidad:** Cada panel usa helpers compartidos (formatters, UI components, session utils).

**Estrategia temporal (FASE 3):**
- Agregar `export` a helpers en el monolito
- Import desde monolito en el panel extraído
- Documentar deuda técnica para FASE 3.5

**Estrategia final (FASE 3.5):**
- Mover helpers a `lib/` y `components/dashboard/shared/`
- Eliminar imports circulares

### 2. Headers Duplicados Son Inconsistentes

**Problema encontrado:**
- Mix de `<h1>` y `<h2>`
- Tamaños inconsistentes (`text-3xl` vs `text-5xl`)
- Colores hardcoded (no usan tokens CSS)
- Posicionamiento heterogéneo

**Solución:** ModuleLayout unifica todos los headers.

### 3. Visual Puede Quedar Redundante

**Caso BillingPanel:**
- ModuleLayout header: "Billing" + descripción
- Hero card original: gradient + título distinto
- Resultado: DOS headers

**Recomendación:** Después de validar funcionamiento, eliminar hero cards redundantes y mover CTAs al `actions` slot.

### 4. Circular Imports Funcionan Pero Son Deuda Técnica

**Actual:** `panels/billing-panel.tsx` → `dashboard-sidebar-demo.tsx` (helpers) → `panels/billing-panel.tsx`

**Funciona:** ESM lazy imports dentro de funciones.

**Pero:** Semánticamente confuso, debe limpiarse en FASE 3.5.

---

## 📋 TEMPLATE DE EXTRACCIÓN PASO A PASO

### PASO 1: Identificar el Panel

**Buscar en `dashboard-sidebar-demo.tsx`:**
```tsx
{activeSection === 'NOMBRE' && (
  // Código del panel (líneas XX-YY)
)}
```

**Anotar:**
- Línea inicio
- Línea fin
- LOC aproximado
- Nombre del componente (si ya es función)

---

### PASO 2: Analizar Dependencias

**Props del parent:**
```tsx
// Buscar la función del panel
function NAMBREPanel({
  prop1,
  prop2,
  // ... anotar todas
}: NAMBREPanelProps) {
```

**Helpers internos:**
- ¿Usa helpers definidos en el monolito?
- ¿Son únicos de este panel?
- ¿Son compartidos con otros panels?

**State:**
- ¿Qué state es local del panel?
- ¿Qué state viene del parent?
- ¿Comparte state con otros panels?

**Handlers:**
- ¿Handlers propios o del parent?
- ¿Comparte handlers con otros panels?

**Ejemplo (BillingPanel):**
Props: usage, monthlySummary, billingHistory (3 total)
Helpers únicos: formatBillingMonthLabel, BillingHistoryRow, MonthCompareBar
Helpers compartidos: StatPill, DetailRow, EmptyBlock, MiniMetric, formatCurrency, session utils
State local: plansModalOpen
Handlers propios: ninguno (solo lectura)

---

### PASO 3: Crear Archivo Nuevo

**Ruta:** `components/dashboard/panels/NOMBRE-panel.tsx`

**Estructura básica:**
```tsx
'use client';

import React, { useState } from 'react';
import { ModuleLayout } from '@/components/layouts';
import { Button, Input, Card } from '@/components/ui';
import { IconName } from 'lucide-react';

// TODO FASE 3.5: Move shared helpers to lib/ and components/dashboard/shared/
import {
  SharedHelper1,
  SharedHelper2,
} from '../../dashboard-sidebar-demo';

// Types (extraer del monolito y hacer explícitos)
interface DataType {
  // ...
}

// Local helpers (únicos de este panel)
function localHelper() {
  // ...
}

// Props interface
interface NAMBREPanelProps {
  // Props del parent
}

export function NAMBREPanel({
  // Props
}: NAMBREPanelProps) {
  // State local

  // Handlers

  return (
    <ModuleLayout
      title="TITULO"
      description="Descripción del módulo"
      icon={<IconName className="w-6 h-6 text-[color:var(--brand-accent)]" />}
      actions={
        <Button variant="primary" onClick={handleAction}>
          Action
        </Button>
      }
      filters={
        // Opcional: barra de filtros/búsqueda
      }
    >
      {/* Content del panel */}
    </ModuleLayout>
  );
}
```

---

### PASO 4: Manejar Helpers Compartidos

**Si son únicos del panel:**
- ✅ Mover al archivo del panel
- Definir antes del componente principal

**Si son compartidos:**
- ⚠️ Temporal (FASE 3): Import desde monolito
- ✅ Agregar `export` al helper en el monolito
- 📝 Documentar con TODO para FASE 3.5

**Ejemplo:**
```tsx
// TODO FASE 3.5: Move to lib/format.ts
import { formatCurrency } from '../../dashboard-sidebar-demo';

// TODO FASE 3.5: Move to components/dashboard/shared/ui.tsx
import { StatPill, DetailRow } from '../../dashboard-sidebar-demo';
```

---

### PASO 5: Aplicar ModuleLayout

**Reemplazar header manual:**

**ANTES:**
```tsx
<div className="mb-6">
  <h2 className="text-3xl font-bold text-slate-950 dark:text-white">
    Panel Title
  </h2>
</div>
```

**DESPUÉS:**
```tsx
<ModuleLayout
  title="Panel Title"
  description="Brief description"
>
  {/* Content */}
</ModuleLayout>
```

**Props disponibles:**
```tsx
interface ModuleLayoutProps {
  title: string;              // Required
  description?: string;       // Optional
  icon?: React.ReactNode;     // Optional
  actions?: React.ReactNode;  // Optional (top-right buttons)
  filters?: React.ReactNode;  // Optional (filter bar below header)
  children: React.ReactNode;  // Required (content area)
  variant?: 'default' | 'compact'; // Optional
  isLoading?: boolean;        // Optional
}
```

---

### PASO 6: Integrar en Monolito

**A. Agregar import:**
```tsx
// En dashboard-sidebar-demo.tsx (top del file)
import { NAMBREPanel } from './dashboard/panels/NOMBRE-panel';
```

**B. Agregar export a helpers compartidos:**
```tsx
// Si el panel usa helpers compartidos, agregar export:
export function StatPill(...) { ... }
export function DetailRow(...) { ... }
export function formatCurrency(...) { ... }
```

**C. Reemplazar código inline:**

**ANTES:**
```tsx
{activeSection === 'NOMBRE' && (
  <div>
    {/* 500 líneas de código del panel */}
  </div>
)}
```

**DESPUÉS:**
```tsx
{activeSection === 'NOMBRE' && (
  <NAMBREPanel
    prop1={prop1}
    prop2={prop2}
    // ... todas las props necesarias
  />
)}
```

**D. Eliminar función del monolito:**
```tsx
// Buscar y eliminar:
function NAMBREPanel({ ... }: NAMBREPanelProps) {
  // ... todo el código
}
```

---

### PASO 7: Validar

**Checklist completo en sección siguiente.**

Básico:
- ✅ Visual idéntico al original
- ✅ Funcionalidad intacta
- ✅ Dark mode funciona
- ✅ Zero regresiones en otros panels

---

## 📊 ORDEN DE EXTRACCIÓN RECOMENDADO

Basado en complejidad (LOC), props, y shared state:

### 1. ✅ BillingPanel (COMPLETADO)
**Stats:**
- LOC: ~325
- Props: 3
- Complejidad: 🟢 Mínima
- Shared state: Ninguno

**Por qué primero:**
- Más simple
- Zero shared state
- Solo lectura (sin handlers)
- Validación perfecta de ModuleLayout

---

### 2. DashboardOverview (SIGUIENTE RECOMENDADO)
**Stats:**
- LOC: ~150
- Props: 7
- Complejidad: 🟢 Baja
- Shared state: Read-only, sin handlers

**Por qué segundo:**
- Muy simple
- Solo muestra stats
- No interactúa con otros panels
- Buen segundo paso

**Consideraciones:**
- Header actual es más elaborado (gradient hero)
- Puede requerir cleanup de redundancia después

---

### 3. ProfilePanel
**Stats:**
- LOC: ~1000
- Props: 7
- Complejidad: 🟡 Media
- Shared state: `navGuardRef`

**Por qué tercero:**
- Relativamente independiente
- Form complejo pero sin shared handlers
- `navGuardRef` es único shared state (fácil de manejar)

**Consideraciones:**
- Tiene sub-navegación interna (tabs)
- Form validation puede requerir testing cuidadoso

---

### 4. CustomersPanel
**Stats:**
- LOC: ~1535
- Props: 17
- Complejidad: 🔴 Alta
- Shared state: `searchQuery`, `documents`, viewer callbacks

**Por qué cuarto:**
- MÁS GRANDE (1535 LOC)
- Muchas props compartidas
- Comparte filtros con DocumentsPanel
- Comparte viewer callbacks

**Consideraciones:**
- Requiere decouple de `searchQuery` y `statusFilter`
- Tabla compleja con sorting/pagination
- Integración con DocumentViewer
- Integración con CreateDraftDrawer

---

### 5. DocumentsPanel (ÚLTIMO)
**Stats:**
- LOC: ~530
- Props: 19
- Complejidad: 🔴🔴 Muy alta
- Shared state: Máximo acoplamiento

**Por qué último:**
- MÁS ACOPLADO de todos
- Comparte searchQuery, statusFilter con CustomersPanel
- Comparte viewer state y callbacks
- Muchos handlers compartidos
- Timeline complejo
- Múltiples modals/drawers

**Consideraciones:**
- Puede requerir refactor adicional antes de extraer
- Considerar extraer DocumentViewer primero
- Puede necesitar Context para shared state

---

## ✅ CHECKLIST DE VALIDACIÓN

### Compilación
- [ ] `npm run build` sin errores TypeScript
- [ ] ESLint sin warnings
- [ ] Zero imports muertos (unused imports)
- [ ] Todos los tipos explícitos (no `any`)

### Visual
- [ ] Header ModuleLayout se ve correctamente
  - [ ] Title con token `--text-primary`
  - [ ] Description con token `--text-secondary`
  - [ ] Icon (si aplica) con brand accent
  - [ ] Actions slot (si aplica) alineado correctamente
- [ ] Content area idéntico al original
- [ ] Spacing correcto (padding 24px desktop / 16px mobile)
- [ ] Border/separadores con token `--border`
- [ ] Dark mode funciona
  - [ ] Header `dark:bg-[#0f1628]`
  - [ ] Tokens CSS adaptan
- [ ] Responsive funciona
  - [ ] Desktop (≥1024px)
  - [ ] Tablet (768-1023px)
  - [ ] Mobile (<768px)

### Funcionalidad
- [ ] Navegación funciona (click en sidebar)
- [ ] Panel se monta correctamente
- [ ] State local se inicializa
- [ ] Handlers funcionan
  - [ ] Click events
  - [ ] Form submits
  - [ ] API calls
- [ ] Modals/Drawers abren y cierran
- [ ] Data loading funciona
  - [ ] Loading state se muestra
  - [ ] Data se renderiza
  - [ ] Empty state funciona
- [ ] Error states funcionan
- [ ] Filtros/búsqueda funcionan (si aplica)
- [ ] Pagination funciona (si aplica)

### Regresiones
- [ ] Otros panels siguen funcionando
  - [ ] Documents
  - [ ] Customers
  - [ ] Profile
  - [ ] Dashboard Overview
  - [ ] Users (MASTER)
  - [ ] Account Requests (MASTER)
- [ ] Shared helpers no rotos
  - [ ] StatPill
  - [ ] DetailRow
  - [ ] EmptyBlock
  - [ ] formatCurrency
  - [ ] session utils
- [ ] Sidebar navigation intacta
- [ ] No hay console errors
- [ ] Performance igual o mejor
  - [ ] No re-renders innecesarios
  - [ ] No memory leaks

### Cleanup (Opcional pero Recomendado)
- [ ] Hero cards redundantes eliminados
- [ ] CTAs movidos a `actions` slot
- [ ] Headers duplicados removidos
- [ ] Código muerto eliminado

---

## 🔧 DEUDA TÉCNICA (FASE 3.5)

### Objetivo
Eliminar imports circulares y centralizar helpers compartidos.

### Archivos a Crear

**1. `lib/format.ts`**
```typescript
// Formatters compartidos
export function formatCurrency(amount: number): string { ... }
export function formatDate(date: string): string { ... }
export function formatBillingMonthLabel(date: string): string { ... }
```

**2. `lib/session-storage.ts`**
```typescript
// Session storage utilities
export function readSessionBoolean(key: string): boolean { ... }
export function writeSessionBoolean(key: string, value: boolean): void { ... }
export function readSessionString(key: string): string | null { ... }
export function writeSessionString(key: string, value: string): void { ... }
```

**3. `components/dashboard/shared/ui.tsx`**
```typescript
// UI components compartidos entre panels
export function StatPill({ ... }) { ... }
export function DetailRow({ ... }) { ... }
export function EmptyBlock({ ... }) { ... }
export function MiniMetric({ ... }) { ... }
```

### Migration Plan

**Paso 1:** Crear los archivos nuevos con helpers movidos del monolito

**Paso 2:** Actualizar imports en todos los panels:
```tsx
// ANTES
import { formatCurrency } from '../../dashboard-sidebar-demo';

// DESPUÉS
import { formatCurrency } from '@/lib/format';
```

**Paso 3:** Actualizar monolito para usar las versiones centralizadas

**Paso 4:** Eliminar helpers del monolito

**Paso 5:** Eliminar TODOs de los panels

### Beneficios
- ✅ Zero circular imports
- ✅ Helpers reutilizables en toda la app
- ✅ Testing más fácil (unit tests aislados)
- ✅ Arquitectura limpia
- ✅ Onboarding más simple

---

## 🐛 TROUBLESHOOTING COMÚN

### Problema: TypeScript error "Cannot find module"
**Causa:** Path del import incorrecto o alias no configurado

**Solución:**
```tsx
// ❌ INCORRECTO
import { ModuleLayout } from '../layouts';

// ✅ CORRECTO
import { ModuleLayout } from '@/components/layouts';
```

Verificar `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### Problema: Props undefined en runtime
**Causa:** Parent no pasa la prop o nombre incorrecto

**Solución:**
1. Verificar props en parent:
```tsx
// En dashboard-sidebar-demo.tsx
<NAMBREPanel
  prop1={value1}
  prop2={value2}
  // ¿Falta alguna prop?
/>
```

2. Verificar interface:
```tsx
interface NAMBREPanelProps {
  prop1: Type1; // ¿Coincide con lo que pasa parent?
  prop2: Type2;
}
```

---

### Problema: Helpers compartidos no funcionan
**Causa:** Olvidaste agregar `export` en el monolito

**Solución:**
```tsx
// En dashboard-sidebar-demo.tsx
// ANTES
function StatPill(...) { ... }

// DESPUÉS
export function StatPill(...) { ... }
```

---

### Problema: Visual diferente al original
**Causa:** Clases CSS diferentes o tokens no aplicados

**Solución:**
1. Comparar clases exactas del original
2. Verificar dark mode variants
3. Verificar spacing/padding
4. Usar tokens CSS en lugar de valores hardcoded:

```tsx
// ❌ INCORRECTO
<div className="text-slate-950 dark:text-white">

// ✅ CORRECTO
<div className="text-[color:var(--text-primary)]">
```

---

### Problema: Monolito más grande después de extraer
**Causa:** No eliminaste la función del monolito

**Solución:**
1. Buscar `function NAMBREPanel` en el monolito
2. Eliminar toda la función
3. Verificar que no haya código duplicado

---

### Problema: Circular dependency warning
**Causa:** Es esperado en FASE 3 (temporal)

**Solución:**
- ⚠️ Temporal: Documentar con TODO
- ✅ Final: Ejecutar FASE 3.5 (mover helpers a lib/)

---

## 📊 MÉTRICAS DE ÉXITO

### Por Panel Extraído

**Reducción del monolito:**
- Simple (BillingPanel): -300 a -500 LOC
- Medio (ProfilePanel): -800 a -1200 LOC
- Complejo (CustomersPanel): -1300 a -1600 LOC

**Archivo nuevo:**
- Simple: +400 a +600 LOC
- Medio: +900 a +1300 LOC
- Complejo: +1400 a +1700 LOC

**Overhead típico:** ~60-100 LOC
- Imports explícitos (+10-20)
- Types explícitos (+30-50)
- TODOs documentados (+10-20)
- Export statement (+1)

### Meta FASE 3 Completa

**Objetivo final:**
Monolito: 10,089 → ~6,000 LOC (-40%)
Panels extraídos: 5 archivos (~3,500 LOC total)
Uniformidad visual: 100%

**Progreso actual (después de BillingPanel):**
Monolito: 10,089 → 9,682 LOC (-4%)
Panels extraídos: 1 archivo (473 LOC)
Uniformidad: 14% (1/7 panels)

---

## 📝 NOTAS FINALES

### Filosofía de Migración

**Gradual:**
- Un panel a la vez
- Validar antes de continuar
- Rollback fácil si falla

**Conservadora:**
- Visual idéntico (requisito)
- Funcionalidad intacta (requisito)
- Zero breaking changes (requisito)

**Pragmática:**
- Deuda técnica documentada
- TODOs claros para FASE 3.5
- Circular imports temporales aceptados

### Preparación para FASE 4 (Opcional)

Este patrón prepara el codebase para **routing migration**:

**FASE 4A — Preparación:**
- Mover state compartido a Context
- Separar data fetching por panel
- Decouplear handlers compartidos

**FASE 4B — Routing:**
- Crear routes: `app/dashboard/documents/page.tsx`
- Convertir panels a page components
- Migrar navegación a `useRouter`
- Validar deep-linking

**FASE 4C — Cleanup:**
- Eliminar `dashboard-sidebar-demo.tsx`
- Eliminar state-based navigation
- Actualizar tests

**Estimado FASE 4:** 2-3 semanas

**Pero FASE 3 es independiente** — puedes quedarte con state-based navigation si funciona para tu caso de uso.

---

## 🎯 RESUMEN EJECUTIVO

**Lo que logramos:**
- ✅ Patrón de extracción validado (BillingPanel POC)
- ✅ ModuleLayout unifica headers
- ✅ Código organizado en archivos separados
- ✅ Visual uniforme y profesional
- ✅ Base sólida para escalabilidad

**Lo que falta:**
- 5 panels por extraer (DashboardOverview, Profile, Customers, Documents, Users)
- Cleanup de headers redundantes
- FASE 3.5 (mover helpers compartidos)
- FASE 4 (routing migration - opcional)

**Beneficio principal:**
Agregar módulo nuevo = copiar template + cambiar lógica → uniformidad garantizada.

---

**Versión:** 1.0
**Última actualización:** 2026-05-10
**Autor:** NTSsign Dev Team
