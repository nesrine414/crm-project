import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Loyalty } from './loyalty';

describe('Loyalty', () => {
  let component: Loyalty;
  let fixture: ComponentFixture<Loyalty>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Loyalty],
    }).compileComponents();

    fixture = TestBed.createComponent(Loyalty);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
