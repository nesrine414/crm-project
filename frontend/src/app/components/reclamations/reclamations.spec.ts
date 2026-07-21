import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reclamations } from './reclamations';

describe('Reclamations', () => {
  let component: Reclamations;
  let fixture: ComponentFixture<Reclamations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reclamations],
    }).compileComponents();

    fixture = TestBed.createComponent(Reclamations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
