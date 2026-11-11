import { parseRemoteResourceDto } from '../infrastructure/RemoteResourceParser';

describe('RegressionDefectRelease (Week 11 - Martín - AC-02 & AC-03)', () => {
  describe('Defect Reproduction: Prototype-delegated & Accessor DTOs in Release', () => {
    it('accepts valid envelope created via prototype inheritance (Hermes / release pattern)', () => {
      // Prototype defining the envelope contract fields
      const envelopeProto = {
        id: 'campus-inc-release-001',
        version: 3,
        status: 'in_progress',
        payload: {
          category: 'electrical',
          description: 'Falla en panel de distribución en release',
          location: 'Edificio B - Planta Baja',
        },
      };

      // In release builds, Hermes and class DTOs delegate properties via prototype
      const releaseDtoInstance = Object.create(envelopeProto);

      const parsed = parseRemoteResourceDto(releaseDtoInstance);
      expect(parsed).toEqual({
        ok: true,
        value: {
          id: 'campus-inc-release-001',
          version: 3,
          status: 'in_progress',
          payload: {
            category: 'electrical',
            description: 'Falla en panel de distribución en release',
            location: 'Edificio B - Planta Baja',
          },
        },
      });
    });

    it('accepts valid envelope using getter accessor properties', () => {
      // Class or object with getter accessors (common in optimized release bundles)
      const accessorEnvelope = {
        get id() {
          return 'campus-inc-getter-002';
        },
        get version() {
          return 1;
        },
        get status() {
          return 'assigned';
        },
        get payload() {
          return {
            category: 'connectivity',
            description: 'Router sin señal en laboratorio',
            location: 'Laboratorio de Redes',
          };
        },
      };

      const parsed = parseRemoteResourceDto(accessorEnvelope);
      expect(parsed).toEqual({
        ok: true,
        value: {
          id: 'campus-inc-getter-002',
          version: 1,
          status: 'assigned',
          payload: {
            category: 'connectivity',
            description: 'Router sin señal en laboratorio',
            location: 'Laboratorio de Redes',
          },
        },
      });
    });

    it('maintains parity: plain debug literal vs release prototype DTO return equivalent results', () => {
      const debugLiteral = {
        id: 'campus-inc-parity-003',
        version: 2,
        status: 'resolved',
        payload: {
          category: 'water',
          description: 'Fuga de agua controlada',
          location: 'Edificio Central',
        },
      };

      const releaseProto = Object.create(debugLiteral);

      const debugResult = parseRemoteResourceDto(debugLiteral);
      const releaseResult = parseRemoteResourceDto(releaseProto);

      expect(debugResult.ok).toBe(true);
      expect(releaseResult.ok).toBe(true);
      expect(releaseResult).toEqual(debugResult);
    });
  });

  describe('Contract Integrity & Boundary Rejection', () => {
    it('still rejects malformed inherited properties (negative version)', () => {
      const invalidProto = {
        id: 'campus-inc-invalid',
        version: -1,
        status: 'open',
        payload: null,
      };
      const invalidInstance = Object.create(invalidProto);

      const parsed = parseRemoteResourceDto(invalidInstance);
      expect(parsed).toEqual({ ok: false, error: 'contract' });
    });

    it('still rejects missing required fields on the prototype chain', () => {
      const missingStatusProto = {
        id: 'campus-inc-missing',
        version: 1,
        payload: null,
      };
      const missingInstance = Object.create(missingStatusProto);

      const parsed = parseRemoteResourceDto(missingInstance);
      expect(parsed).toEqual({ ok: false, error: 'contract' });
    });
  });
});
